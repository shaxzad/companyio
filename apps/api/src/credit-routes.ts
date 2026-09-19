import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { PrismaClient, Prisma } from './generated/prisma/client.ts';
import type { User as AuthUser } from '@companyio/auth-contracts';
import { sendApiError } from './http-errors.ts';
import { assertDayChangeAllowed } from './audit.ts';
import { syncTankClosingForStationDate, toYmdKarachi } from './stock-recon.ts';

type Authenticator = (authorization?: string) => Promise<AuthUser | null>;

const id = z.string().min(1);
const positive = z.number().positive();
const num = (value: unknown) => Number(value ?? 0);

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

const canEditCredit = (role: string | undefined) =>
  role === 'owner' || role === 'manager' || role === 'accountant' || role === 'staff';

const creditSaleInclude = {
  organization: true,
  vehicle: true,
  station: true,
  lines: { include: { fuelType: true } },
} satisfies Prisma.SaleInclude;

const serializeSale = (sale: Prisma.SaleGetPayload<{ include: typeof creditSaleInclude }>) => ({
  id: sale.id,
  saleNumber: sale.saleNumber,
  invoiceNumber: sale.invoiceNumber,
  driverName: sale.driverName,
  saleType: sale.saleType,
  soldAt: sale.soldAt.toISOString(),
  createdAt: sale.createdAt.toISOString(),
  totalAmount: num(sale.totalAmount),
  totalLitres: num(sale.totalLitres),
  notes: sale.notes,
  station: {
    id: sale.station.id,
    name: sale.station.name,
    code: sale.station.code,
    address: sale.station.address,
    logoUrl: sale.station.logoUrl,
  },
  organization: sale.organization
    ? {
        id: sale.organization.id,
        name: sale.organization.name,
        email: sale.organization.email,
        phone: sale.organization.phone,
        address: sale.organization.address,
        creditType: sale.organization.creditType,
      }
    : null,
  vehicle: sale.vehicle
    ? {
        id: sale.vehicle.id,
        registration: sale.vehicle.registration,
        driver: sale.vehicle.driver,
      }
    : null,
  lines: sale.lines.map((line) => ({
    id: line.id,
    fuelTypeId: line.fuelTypeId,
    productName: line.fuelType.name,
    productCode: line.fuelType.code,
    litres: num(line.litres),
    unitPrice: num(line.unitPrice),
    amount: num(line.amount),
  })),
});

export const registerCreditRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  authenticate: Authenticator
) => {
  app.post('/api/v1/fuel/credit-sales', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    if (!canEditCredit(user.role)) {
      return sendApiError(reply, 403, 'You cannot post credit sales.', { code: 'FORBIDDEN' });
    }

    const input = z
      .object({
        stationId: id,
        organizationId: id,
        vehicleId: id,
        fuelTypeId: id,
        tankId: id,
        litres: positive,
        unitPrice: positive.optional(),
        driverName: z.string().trim().max(120).optional().or(z.literal('')),
        soldAt: z.coerce.date().optional(),
        notes: z.string().trim().max(500).optional().or(z.literal('')),
        auditReason: z.string().min(8).max(500).optional(),
      })
      .parse(request.body);

    const [station, fuelType, tank, organization, vehicle] = await Promise.all([
      prisma.station.findFirst({
        where: { id: input.stationId, businessId: user.main_business_id, active: true },
      }),
      prisma.fuelType.findFirst({
        where: { id: input.fuelTypeId, businessId: user.main_business_id, active: true },
      }),
      prisma.tank.findUnique({ where: { id: input.tankId } }),
      prisma.organization.findFirst({
        where: { id: input.organizationId, businessId: user.main_business_id, active: true },
      }),
      prisma.vehicle.findFirst({
        where: {
          id: input.vehicleId,
          active: true,
          organization: { businessId: user.main_business_id },
        },
      }),
    ]);

    if (!station)
      return sendApiError(reply, 400, 'Station not found.', {
        fields: { stationId: 'Station not found.' },
      });

    const soldAt = input.soldAt ?? new Date();
    const lock = await assertDayChangeAllowed(prisma, reply, {
      stationId: station.id,
      businessDateYmd: toYmdKarachi(soldAt),
      auditReason: input.auditReason,
    });
    if (!lock.allowed) return;
    if (!organization)
      return sendApiError(reply, 400, 'Company not found or inactive.', {
        fields: { organizationId: 'Company not found or inactive.' },
      });
    if (!vehicle || vehicle.organizationId !== organization.id)
      return sendApiError(reply, 400, 'Vehicle does not belong to the selected company.', {
        fields: { vehicleId: 'Vehicle does not belong to the selected company.' },
      });
    if (!fuelType)
      return sendApiError(reply, 400, 'Product not found.', {
        fields: { fuelTypeId: 'Product not found.' },
      });
    if (!tank || tank.stationId !== station.id || tank.fuelTypeId !== fuelType.id)
      return sendApiError(reply, 400, 'Station, tank, and product do not match.', {
        fields: { tankId: 'Station, tank, and product do not match.' },
      });
    if (num(tank.currentStock) < input.litres)
      return sendApiError(reply, 400, 'Insufficient tank stock.', {
        fields: { litres: 'Insufficient tank stock.' },
      });

    const unitPrice = input.unitPrice ?? num(fuelType.sellingPrice);
    if (!(unitPrice > 0))
      return sendApiError(reply, 400, 'Selling rate is required.', {
        fields: { unitPrice: 'Selling rate is required.' },
      });

    const amount = Math.round(input.litres * unitPrice * 100) / 100;
    const stamp = Date.now().toString().slice(-8);
    const year = new Date().getFullYear();
    const saleNumber = `CR-${year}-${stamp}`;
    const invoiceNumber = `INV-${year}-${stamp}`;
    const driverName = (input.driverName && input.driverName.trim()) || vehicle.driver || null;

    const created = await prisma.$transaction(async (tx) => {
      const updatedTank = await tx.tank.update({
        where: { id: tank.id },
        data: { currentStock: { decrement: input.litres } },
      });
      const sale = await tx.sale.create({
        data: {
          id: randomUUID(),
          saleNumber,
          invoiceNumber,
          driverName,
          stationId: station.id,
          organizationId: organization.id,
          vehicleId: vehicle.id,
          saleType: 'CREDIT',
          soldAt,
          totalAmount: amount,
          totalLitres: input.litres,
          notes: input.notes || null,
          createdBy: user.id,
          lines: {
            create: {
              id: randomUUID(),
              fuelTypeId: fuelType.id,
              litres: input.litres,
              unitPrice,
              amount,
            },
          },
        },
        include: creditSaleInclude,
      });
      await tx.inventoryMovement.create({
        data: {
          id: randomUUID(),
          stationId: station.id,
          tankId: tank.id,
          fuelTypeId: fuelType.id,
          sourceType: 'SALE',
          sourceId: sale.id,
          quantity: -input.litres,
          balanceAfter: updatedTank.currentStock,
        },
      });
      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          businessId: user.main_business_id,
          userId: user.id,
          action: 'CREATE',
          entityType: 'CREDIT_SALE',
          entityId: sale.id,
          details: {
            invoiceNumber,
            saleNumber,
            amount,
            litres: input.litres,
            ...(lock.reason ? { reason: lock.reason, dayStatus: lock.dayStatus } : {}),
          },
        },
      });
      await syncTankClosingForStationDate(tx, station.id, toYmdKarachi(soldAt), tank.id);
      return sale;
    });

    return reply.code(201).send(serializeSale(created));
  });

  app.get('/api/v1/fuel/credit-sales/:saleId', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const params = z.object({ saleId: id }).parse(request.params);
    const sale = await prisma.sale.findFirst({
      where: {
        id: params.saleId,
        saleType: 'CREDIT',
        station: { businessId: user.main_business_id },
      },
      include: creditSaleInclude,
    });
    if (!sale) return sendApiError(reply, 404, 'Credit sale not found.', { code: 'NOT_FOUND' });
    return reply.send(serializeSale(sale));
  });

  app.get('/api/v1/fuel/organizations/:organizationId/ledger', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const params = z.object({ organizationId: id }).parse(request.params);
    const organization = await prisma.organization.findFirst({
      where: { id: params.organizationId, businessId: user.main_business_id },
      include: {
        sales: {
          where: { saleType: 'CREDIT', status: 'CONFIRMED' },
          include: { vehicle: true, lines: { include: { fuelType: true } } },
          orderBy: { soldAt: 'asc' },
        },
        payments: { orderBy: { paidAt: 'asc' } },
      },
    });
    if (!organization) return sendApiError(reply, 404, 'Company not found.', { code: 'NOT_FOUND' });

    const openingBalance = num(organization.openingBalance);
    type LedgerDraft = {
      date: Date;
      type: 'OPENING' | 'CREDIT' | 'PAYMENT';
      debit: number;
      credit: number;
      reference: string;
      description: string;
      saleId?: string;
    };
    const entries: LedgerDraft[] = [
      {
        date: organization.createdAt,
        type: 'OPENING',
        debit: openingBalance > 0 ? openingBalance : 0,
        credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
        reference: 'OPENING',
        description: 'Opening balance',
      },
      ...organization.sales.map((sale): LedgerDraft => ({
        date: sale.soldAt,
        type: 'CREDIT',
        debit: num(sale.totalAmount),
        credit: 0,
        reference: sale.invoiceNumber ?? sale.saleNumber,
        description: `${sale.vehicle?.registration ?? 'Vehicle'} · ${sale.lines
          .map((line) => line.fuelType.code)
          .join(', ')}`,
        saleId: sale.id,
      })),
      ...organization.payments.map((payment): LedgerDraft => ({
        date: payment.paidAt,
        type: 'PAYMENT',
        debit: 0,
        credit: num(payment.amount),
        reference: payment.reference ?? payment.id,
        description: `${payment.method} payment`,
      })),
    ];
    entries.sort((left, right) => left.date.getTime() - right.date.getTime());

    let balance = 0;
    const ledger = entries.map((entry) => {
      balance += entry.debit - entry.credit;
      return {
        ...entry,
        date: entry.date.toISOString(),
        balance: Math.round(balance * 100) / 100,
      };
    });

    return reply.send({
      organization: {
        id: organization.id,
        name: organization.name,
        email: organization.email,
        phone: organization.phone,
        creditType: organization.creditType,
        creditLimit: num(organization.creditLimit),
        openingBalance,
        active: organization.active,
      },
      ledger,
      outstanding: Math.round(balance * 100) / 100,
    });
  });
};
