import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { User as AuthUser } from '@companyio/auth-contracts';

type Authenticator = (authorization?: string) => Promise<AuthUser | null>;

const id = z.string().min(1);
const num = (value: unknown) => Number(value ?? 0);
const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const requireUser = async (
  request: { headers: { authorization?: string } },
  reply: { code: (status: number) => { send: (body: unknown) => unknown } },
  authenticate: Authenticator
) => {
  const user = await authenticate(request.headers.authorization);
  if (!user) {
    reply.code(401).send({ message: 'Authentication required.' });
    return null;
  }
  return user;
};

const serializeReceipt = (receipt: {
  id: string;
  stationId: string;
  businessDayId: string | null;
  supplier: string;
  tankerNumber: string | null;
  invoiceNumber: string | null;
  receivedAt: Date;
  expectedLitres: unknown;
  actualLitres: unknown;
  totalDip: unknown;
  receivedDip: unknown;
  accessLitres: unknown;
  shortageLitres: unknown;
  purchaseRate: unknown;
  accessRateMode: string;
  accessRate: unknown;
  fuelCost: unknown;
  tankerTip: unknown;
  otherReceivingCost: unknown;
  totalCost: unknown;
  notes: string | null;
  createdAt: Date;
  lines: Array<{
    id: string;
    fuelTypeId: string;
    tankId: string;
    litres: unknown;
    purchasePrice: unknown;
    amount: unknown;
    fuelType: { id: string; name: string; code: string };
    tank: { id: string; name: string };
  }>;
}) => {
  const line = receipt.lines[0];
  return {
    id: receipt.id,
    stationId: receipt.stationId,
    businessDayId: receipt.businessDayId,
    supplier: receipt.supplier,
    tankerNumber: receipt.tankerNumber,
    invoiceNumber: receipt.invoiceNumber,
    receivedAt: receipt.receivedAt.toISOString(),
    enteredAt: receipt.createdAt.toISOString(),
    expectedLitres: num(receipt.expectedLitres),
    actualLitres: num(receipt.actualLitres),
    totalDip: receipt.totalDip === null ? null : num(receipt.totalDip),
    receivedDip: receipt.receivedDip === null ? null : num(receipt.receivedDip),
    accessLitres: num(receipt.accessLitres),
    shortageLitres: num(receipt.shortageLitres),
    purchaseRate: num(receipt.purchaseRate),
    accessRateMode: receipt.accessRateMode,
    accessRate: num(receipt.accessRate),
    fuelCost: num(receipt.fuelCost),
    tankerTip: num(receipt.tankerTip),
    otherReceivingCost: num(receipt.otherReceivingCost),
    totalCost: num(receipt.totalCost),
    notes: receipt.notes,
    fuelTypeId: line?.fuelTypeId ?? null,
    fuelTypeName: line?.fuelType.name ?? null,
    fuelTypeCode: line?.fuelType.code ?? null,
    tankId: line?.tankId ?? null,
    tankName: line?.tank.name ?? null,
  };
};

const includeLines = {
  lines: { include: { fuelType: true, tank: true } },
} as const;

export const registerReceivingRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  authenticate: Authenticator
) => {
  app.get('/api/v1/fuel/receipts', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z
      .object({
        stationId: id.optional(),
        tankId: id.optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
      })
      .parse(request.query);

    const receipts = await prisma.fuelReceipt.findMany({
      where: {
        station: { businessId: user.main_business_id },
        ...(query.stationId ? { stationId: query.stationId } : {}),
        ...(query.tankId ? { lines: { some: { tankId: query.tankId } } } : {}),
      },
      include: includeLines,
      orderBy: { receivedAt: 'desc' },
      take: query.limit ?? 40,
    });
    return reply.send(receipts.map(serializeReceipt));
  });

  app.post('/api/v1/fuel/receiving', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    if (!['owner', 'manager', 'staff'].includes(user.role)) {
      return reply.code(403).send({ message: 'Your role cannot record tanker receiving.' });
    }

    const input = z
      .object({
        stationId: id,
        businessDayId: id.optional(),
        supplier: z.string().min(1).max(160),
        tankerNumber: z.string().max(80).optional(),
        invoiceNumber: z.string().max(80).optional(),
        fuelTypeId: id,
        tankId: id,
        expectedLitres: z.number().positive(),
        actualLitres: z.number().positive(),
        totalDip: z.number().nonnegative().optional(),
        receivedDip: z.number().nonnegative().optional(),
        purchaseRate: z.number().positive(),
        accessRateMode: z.enum(['PURCHASE', 'SELLING']).default('PURCHASE'),
        tankerTip: z.number().nonnegative().default(0),
        otherReceivingCost: z.number().nonnegative().default(0),
        receivedAt: z.coerce.date().optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(request.body);

    const [station, fuelType, tank] = await Promise.all([
      prisma.station.findFirst({
        where: { id: input.stationId, businessId: user.main_business_id, active: true },
      }),
      prisma.fuelType.findFirst({
        where: { id: input.fuelTypeId, businessId: user.main_business_id, active: true },
      }),
      prisma.tank.findUnique({ where: { id: input.tankId } }),
    ]);

    if (
      !station ||
      !fuelType ||
      !tank ||
      tank.stationId !== station.id ||
      tank.fuelTypeId !== fuelType.id
    )
      return reply.code(400).send({ message: 'Station, tank, and product do not match.' });

    let businessDayId = input.businessDayId ?? null;
    if (businessDayId) {
      const day = await prisma.businessDay.findFirst({
        where: { id: businessDayId, stationId: station.id, status: 'OPEN' },
      });
      if (!day) return reply.code(409).send({ message: 'Open business day not found for this station.' });
    } else {
      const openDay = await prisma.businessDay.findFirst({
        where: { stationId: station.id, status: 'OPEN' },
        orderBy: { businessDate: 'desc' },
      });
      businessDayId = openDay?.id ?? null;
    }

    const delta = round(input.actualLitres - input.expectedLitres, 3);
    const accessLitres = delta > 0 ? delta : 0;
    const shortageLitres = delta < 0 ? round(Math.abs(delta), 3) : 0;
    const accessRate =
      input.accessRateMode === 'SELLING' ? num(fuelType.sellingPrice) : input.purchaseRate;
    const fuelCost = round(input.actualLitres * input.purchaseRate, 2);
    const totalCost = round(fuelCost + input.tankerTip + input.otherReceivingCost, 2);
    const receivedAt = input.receivedAt ?? new Date();

    try {
      const created = await prisma.$transaction(async (tx) => {
        const updatedTank = await tx.tank.update({
          where: { id: tank.id },
          data: { currentStock: { increment: input.actualLitres } },
        });
        const receipt = await tx.fuelReceipt.create({
          data: {
            id: randomUUID(),
            stationId: station.id,
            businessDayId,
            supplier: input.supplier,
            tankerNumber: input.tankerNumber,
            invoiceNumber: input.invoiceNumber,
            receivedAt,
            expectedLitres: input.expectedLitres,
            actualLitres: input.actualLitres,
            totalDip: input.totalDip,
            receivedDip: input.receivedDip,
            accessLitres,
            shortageLitres,
            purchaseRate: input.purchaseRate,
            accessRateMode: input.accessRateMode,
            accessRate,
            fuelCost,
            tankerTip: input.tankerTip,
            otherReceivingCost: input.otherReceivingCost,
            totalCost,
            notes: input.notes,
            createdBy: user.id,
            lines: {
              create: {
                id: randomUUID(),
                fuelTypeId: fuelType.id,
                tankId: tank.id,
                litres: input.actualLitres,
                purchasePrice: input.purchaseRate,
                amount: fuelCost,
              },
            },
          },
          include: includeLines,
        });
        await tx.inventoryMovement.create({
          data: {
            id: randomUUID(),
            stationId: station.id,
            tankId: tank.id,
            fuelTypeId: fuelType.id,
            sourceType: 'RECEIPT',
            sourceId: receipt.id,
            quantity: input.actualLitres,
            balanceAfter: updatedTank.currentStock,
          },
        });
        if (businessDayId) {
          await tx.businessDayTank.updateMany({
            where: { businessDayId, tankId: tank.id },
            data: { closingStock: updatedTank.currentStock },
          });
        }
        await tx.auditLog.create({
          data: {
            id: randomUUID(),
            businessId: user.main_business_id,
            userId: user.id,
            action: 'CREATE',
            entityType: 'FUEL_RECEIPT',
            entityId: receipt.id,
            details: {
              accessLitres,
              shortageLitres,
              actualLitres: input.actualLitres,
              expectedLitres: input.expectedLitres,
            },
          },
        });
        return receipt;
      });

      return reply.code(201).send(serializeReceipt(created));
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        return reply.code(409).send({ message: 'That invoice number already exists for this station.' });
      throw error;
    }
  });
};
