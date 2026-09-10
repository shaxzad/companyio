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

const toYmd = (value: Date) => value.toISOString().slice(0, 10);

const rateFor = async (prisma: PrismaClient, fuelTypeId: string, businessDate: Date, fallback: unknown) => {
  const dated = await prisma.sellingRate.findFirst({
    where: { fuelTypeId, effectiveFrom: { lte: businessDate } },
    orderBy: { effectiveFrom: 'desc' },
  });
  return dated ? num(dated.sellingPrice) : num(fallback);
};

const productTotals = (
  lines: Array<{ productCode: string; productName: string; litres: number; amount: number }>
) => {
  const totals = new Map<string, { productCode: string; productName: string; litres: number; amount: number }>();
  lines.forEach((line) => {
    const current = totals.get(line.productCode) ?? {
      productCode: line.productCode,
      productName: line.productName,
      litres: 0,
      amount: 0,
    };
    current.litres = round(current.litres + line.litres, 3);
    current.amount = round(current.amount + line.amount, 2);
    totals.set(line.productCode, current);
  });
  return [...totals.values()];
};

export const registerMeterSalesRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  authenticate: Authenticator
) => {
  app.get('/api/v1/fuel/meter-sales/sheet', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z
      .object({ stationId: id, businessDayId: id.optional() })
      .parse(request.query);
    const station = await prisma.station.findFirst({
      where: { id: query.stationId, businessId: user.main_business_id },
    });
    if (!station) return reply.code(404).send({ message: 'Station not found.' });

    const day = query.businessDayId
      ? await prisma.businessDay.findFirst({
          where: { id: query.businessDayId, stationId: station.id },
          include: {
            meters: {
              include: {
                nozzle: { include: { pump: true, fuelType: true, tank: true } },
              },
            },
          },
        })
      : await prisma.businessDay.findFirst({
          where: { stationId: station.id, status: 'OPEN' },
          include: {
            meters: {
              include: {
                nozzle: { include: { pump: true, fuelType: true, tank: true } },
              },
            },
          },
          orderBy: { businessDate: 'desc' },
        });

    if (!day)
      return reply.code(409).send({
        message: 'Open a business date before entering meter sales.',
      });

    const posted = await prisma.sale.findFirst({
      where: { businessDayId: day.id, saleType: 'CASH', organizationId: null },
      include: { lines: { include: { fuelType: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const rows = await Promise.all(
      day.meters.map(async (meter) => {
        const suggestedRate = await rateFor(
          prisma,
          meter.nozzle.fuelTypeId,
          day.businessDate,
          meter.nozzle.fuelType.sellingPrice
        );
        const postedLine = posted?.lines.find((line) => line.nozzleId === meter.nozzleId);
        const opening = num(meter.openingReading);
        const closing = postedLine ? num(postedLine.closingMeter) : null;
        const rate = postedLine ? num(postedLine.unitPrice) : suggestedRate;
        const litres = closing === null ? 0 : round(closing - opening, 3);
        const amount = round(litres * rate, 2);
        return {
          nozzleId: meter.nozzleId,
          pumpName: meter.nozzle.pump.name,
          pumpNumber: meter.nozzle.pump.number,
          nozzleNumber: meter.nozzle.number,
          fuelTypeId: meter.nozzle.fuelTypeId,
          productName: meter.nozzle.fuelType.name,
          productCode: meter.nozzle.fuelType.code,
          tankId: meter.nozzle.tankId,
          tankName: meter.nozzle.tank?.name ?? null,
          openingReading: opening,
          suggestedRate,
          closingReading: closing,
          unitPrice: rate,
          litres,
          amount,
          rateOverrideReason: postedLine?.rateOverrideReason ?? null,
        };
      })
    );

    rows.sort(
      (left, right) =>
        left.productName.localeCompare(right.productName) ||
        left.pumpNumber.localeCompare(right.pumpNumber) ||
        left.nozzleNumber.localeCompare(right.nozzleNumber)
    );

    const totals = productTotals(
      rows.map((row) => ({
        productCode: row.productCode,
        productName: row.productName,
        litres: row.litres,
        amount: row.amount,
      }))
    );

    return reply.send({
      businessDay: {
        id: day.id,
        businessDate: toYmd(day.businessDate),
        status: day.status,
      },
      alreadyPosted: Boolean(posted),
      postedSale: posted
        ? {
            id: posted.id,
            saleNumber: posted.saleNumber,
            soldAt: posted.soldAt.toISOString(),
            enteredAt: posted.createdAt.toISOString(),
            totalLitres: num(posted.totalLitres),
            totalAmount: num(posted.totalAmount),
          }
        : null,
      rows,
      productTotals: totals,
      grandTotal: {
        litres: round(
          totals.reduce((sum, item) => sum + item.litres, 0),
          3
        ),
        amount: round(
          totals.reduce((sum, item) => sum + item.amount, 0),
          2
        ),
      },
    });
  });

  app.post('/api/v1/fuel/meter-sales', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    if (!['owner', 'manager', 'staff'].includes(user.role)) {
      return reply.code(403).send({ message: 'Your role cannot enter meter sales.' });
    }
    const input = z
      .object({
        stationId: id,
        businessDayId: id,
        soldAt: z.coerce.date().optional(),
        lines: z
          .array(
            z.object({
              nozzleId: id,
              closingMeter: z.number().nonnegative(),
              unitPrice: z.number().positive().optional(),
              rateOverrideReason: z.string().max(240).optional(),
            })
          )
          .min(1),
      })
      .parse(request.body);

    const station = await prisma.station.findFirst({
      where: { id: input.stationId, businessId: user.main_business_id, active: true },
    });
    if (!station) return reply.code(404).send({ message: 'Station not found.' });

    const day = await prisma.businessDay.findFirst({
      where: { id: input.businessDayId, stationId: station.id },
      include: {
        meters: {
          include: { nozzle: { include: { fuelType: true, tank: true } } },
        },
      },
    });
    if (!day) return reply.code(404).send({ message: 'Business day not found.' });
    if (day.status !== 'OPEN')
      return reply.code(409).send({ message: 'This business date is closed.' });

    const already = await prisma.sale.findFirst({
      where: { businessDayId: day.id, saleType: 'CASH', organizationId: null },
    });
    if (already)
      return reply.code(409).send({ message: 'Meter sales for this business date are already posted.' });

    const meterByNozzle = new Map(day.meters.map((meter) => [meter.nozzleId, meter]));
    if (day.meters.length !== input.lines.length)
      return reply.code(400).send({
        message: 'Enter a closing reading for every meter opened on this day.',
      });

    type ComputedLine = {
      meter: (typeof day.meters)[number];
      tank: NonNullable<(typeof day.meters)[number]['nozzle']['tank']>;
      opening: number;
      closing: number;
      unitPrice: number;
      litres: number;
      amount: number;
      rateOverrideReason: string | null;
      productCode: string;
      productName: string;
    };
    const computed: ComputedLine[] = [];
    for (const line of input.lines) {
      const meter = meterByNozzle.get(line.nozzleId);
      if (!meter) return reply.code(400).send({ message: 'A meter is not on this business day.' });
      const tank = meter.nozzle.tank;
      if (!tank)
        return reply.code(400).send({
          message: `Link ${meter.nozzle.fuelType.name} nozzle ${meter.nozzle.number} to a tank in Settings.`,
        });
      const opening = num(meter.openingReading);
      if (line.closingMeter < opening)
        return reply.code(400).send({
          message: `Closing reading for nozzle ${meter.nozzle.number} cannot be below opening ${opening}.`,
        });
      const suggestedRate = await rateFor(
        prisma,
        meter.nozzle.fuelTypeId,
        day.businessDate,
        meter.nozzle.fuelType.sellingPrice
      );
      const unitPrice = line.unitPrice ?? suggestedRate;
      if (round(unitPrice, 2) !== round(suggestedRate, 2) && !line.rateOverrideReason)
        return reply.code(400).send({
          message: `A reason is required to change the ${meter.nozzle.fuelType.name} rate.`,
        });
      const litres = round(line.closingMeter - opening, 3);
      computed.push({
        meter,
        tank,
        opening,
        closing: line.closingMeter,
        unitPrice,
        litres,
        amount: round(litres * unitPrice, 2),
        rateOverrideReason:
          round(unitPrice, 2) !== round(suggestedRate, 2) ? (line.rateOverrideReason ?? null) : null,
        productCode: meter.nozzle.fuelType.code,
        productName: meter.nozzle.fuelType.name,
      });
    }

    const litresByTank = new Map<string, number>();
    computed.forEach((row) => {
      litresByTank.set(row.tank.id, round((litresByTank.get(row.tank.id) ?? 0) + row.litres, 3));
    });
    for (const [tankId, litres] of litresByTank) {
      const tank = computed.find((row) => row.tank.id === tankId)?.tank;
      if (tank && num(tank.currentStock) < litres)
        return reply.code(400).send({
          message: `Insufficient stock in ${tank.name} for ${litres} L sold.`,
        });
    }

    const totalLitres = round(
      computed.reduce((sum, row) => sum + row.litres, 0),
      3
    );
    const totalAmount = round(
      computed.reduce((sum, row) => sum + row.amount, 0),
      2
    );
    const soldAt = input.soldAt ?? new Date();
    const saleNumber = `SALE-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          id: randomUUID(),
          saleNumber,
          stationId: station.id,
          businessDayId: day.id,
          saleType: 'CASH',
          soldAt,
          totalAmount,
          totalLitres,
          notes: 'METER_SHEET',
          createdBy: user.id,
          lines: {
            create: computed.map((row) => ({
              id: randomUUID(),
              fuelTypeId: row.meter.nozzle.fuelTypeId,
              nozzleId: row.meter.nozzleId,
              litres: row.litres,
              unitPrice: row.unitPrice,
              amount: row.amount,
              openingMeter: row.opening,
              closingMeter: row.closing,
              rateOverrideReason: row.rateOverrideReason,
            })),
          },
        },
        include: { lines: { include: { fuelType: true } } },
      });

      for (const row of computed) {
        const updatedTank = await tx.tank.update({
          where: { id: row.tank.id },
          data: { currentStock: { decrement: row.litres } },
        });
        await tx.inventoryMovement.create({
          data: {
            id: randomUUID(),
            stationId: station.id,
            tankId: row.tank.id,
            fuelTypeId: row.meter.nozzle.fuelTypeId,
            sourceType: 'SALE',
            sourceId: created.id,
            quantity: -row.litres,
            balanceAfter: updatedTank.currentStock,
          },
        });
        await tx.nozzle.update({
          where: { id: row.meter.nozzleId },
          data: { currentMeter: row.closing },
        });
        await tx.businessDayMeter.update({
          where: { id: row.meter.id },
          data: { closingReading: row.closing },
        });
      }

      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          businessId: user.main_business_id,
          userId: user.id,
          action: 'CREATE',
          entityType: 'METER_SALE',
          entityId: created.id,
          details: { saleNumber, totalAmount, totalLitres, businessDayId: day.id },
        },
      });
      return created;
    });

    const totals = productTotals(
      sale.lines.map((line) => ({
        productCode: line.fuelType.code,
        productName: line.fuelType.name,
        litres: num(line.litres),
        amount: num(line.amount),
      }))
    );

    return reply.code(201).send({
      id: sale.id,
      saleNumber: sale.saleNumber,
      soldAt: sale.soldAt.toISOString(),
      enteredAt: sale.createdAt.toISOString(),
      totalLitres: num(sale.totalLitres),
      totalAmount: num(sale.totalAmount),
      productTotals: totals,
    });
  });
};
