import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { User as AuthUser } from '@companyio/auth-contracts';

type Authenticator = (authorization?: string) => Promise<AuthUser | null>;

const id = z.string().min(1);
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD for the business date.');

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

const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const toYmd = (value: Date) => value.toISOString().slice(0, 10);
const num = (value: unknown) => Number(value ?? 0);

const serializeDay = (day: {
  id: string;
  stationId: string;
  businessDate: Date;
  status: string;
  bbfCash: unknown;
  openedAt: Date;
  openedBy: string;
  enteredAt: Date;
  overrideReason: string | null;
  closedAt: Date | null;
  closedBy: string | null;
  meters: Array<{
    id: string;
    nozzleId: string;
    openingReading: unknown;
    closingReading: unknown;
    nozzle: {
      number: string;
      pump: { name: string; number: string };
      fuelType: { name: string; code: string };
    };
  }>;
  tanks: Array<{
    id: string;
    tankId: string;
    openingStock: unknown;
    closingStock: unknown;
    tank: { name: string; fuelType: { name: string; code: string } };
  }>;
}) => ({
  id: day.id,
  stationId: day.stationId,
  businessDate: toYmd(day.businessDate),
  status: day.status,
  bbfCash: num(day.bbfCash),
  openedAt: day.openedAt.toISOString(),
  openedBy: day.openedBy,
  enteredAt: day.enteredAt.toISOString(),
  overrideReason: day.overrideReason,
  closedAt: day.closedAt?.toISOString() ?? null,
  closedBy: day.closedBy,
  meters: day.meters.map((row) => ({
    id: row.id,
    nozzleId: row.nozzleId,
    pumpName: row.nozzle.pump.name,
    pumpNumber: row.nozzle.pump.number,
    nozzleNumber: row.nozzle.number,
    productName: row.nozzle.fuelType.name,
    productCode: row.nozzle.fuelType.code,
    openingReading: num(row.openingReading),
    closingReading: row.closingReading === null ? null : num(row.closingReading),
  })),
  tanks: day.tanks.map((row) => ({
    id: row.id,
    tankId: row.tankId,
    tankName: row.tank.name,
    productName: row.tank.fuelType.name,
    productCode: row.tank.fuelType.code,
    openingStock: num(row.openingStock),
    closingStock: row.closingStock === null ? null : num(row.closingStock),
  })),
});

const dayInclude = {
  meters: {
    include: { nozzle: { include: { pump: true, fuelType: true } } },
  },
  tanks: {
    include: { tank: { include: { fuelType: true } } },
  },
};

export const registerOpeningRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  authenticate: Authenticator
) => {
  app.get('/api/v1/fuel/days/preview', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z.object({ stationId: id, businessDate: ymd }).parse(request.query);
    const station = await prisma.station.findFirst({
      where: { id: query.stationId, businessId: user.main_business_id },
    });
    if (!station) return reply.code(404).send({ message: 'Station not found.' });

    const businessDate = toDate(query.businessDate);
    const existing = await prisma.businessDay.findUnique({
      where: { stationId_businessDate: { stationId: station.id, businessDate } },
      include: dayInclude,
    });

    const previous = await prisma.businessDay.findFirst({
      where: { stationId: station.id, businessDate: { lt: businessDate } },
      include: {
        meters: true,
        tanks: true,
      },
      orderBy: { businessDate: 'desc' },
    });

    const [nozzles, tanks] = await Promise.all([
      prisma.nozzle.findMany({
        where: { active: true, pump: { stationId: station.id, active: true } },
        include: { pump: true, fuelType: true },
        orderBy: [{ fuelType: { name: 'asc' } }, { number: 'asc' }],
      }),
      prisma.tank.findMany({
        where: { stationId: station.id, active: true },
        include: { fuelType: true },
        orderBy: [{ fuelType: { name: 'asc' } }, { name: 'asc' }],
      }),
    ]);

    const previousClosed = previous?.status === 'CLOSED';
    const requiresOwnerOverride = Boolean(previous && !previousClosed);
    const canOpen = !existing && (!previous || previousClosed || user.role === 'owner');

    const meterByNozzle = new Map((previous?.meters ?? []).map((row) => [row.nozzleId, row]));
    const tankById = new Map((previous?.tanks ?? []).map((row) => [row.tankId, row]));
    const source = previousClosed ? 'LAST_CLOSED_DAY' : 'MASTER_SETUP';

    return reply.send({
      stationId: station.id,
      businessDate: query.businessDate,
      canOpen,
      alreadyOpened: Boolean(existing),
      requiresOwnerOverride,
      blockedReason: existing
        ? `This business date is already ${
            existing.status === 'CLOSED'
              ? 'closed'
              : existing.status === 'RECONCILED'
                ? 'reconciled'
                : 'open'
          }.`
        : requiresOwnerOverride
          ? `Previous day ${toYmd(previous!.businessDate)} is still ${previous!.status === 'RECONCILED' ? 'reconciled (not closed)' : 'open'}. Only the owner can override.`
          : null,
      previousDay: previous
        ? { businessDate: toYmd(previous.businessDate), status: previous.status }
        : null,
      source: existing ? 'EXISTING_DAY' : source,
      bbfCashSuggested: previous ? num(previous.bbfCash) : 0,
      existing: existing ? serializeDay(existing) : null,
      meters: nozzles.map((nozzle) => {
        const prior = meterByNozzle.get(nozzle.id);
        const suggested = previousClosed
          ? num(prior?.closingReading ?? prior?.openingReading ?? nozzle.currentMeter)
          : num(nozzle.currentMeter);
        return {
          nozzleId: nozzle.id,
          pumpName: nozzle.pump.name,
          pumpNumber: nozzle.pump.number,
          nozzleNumber: nozzle.number,
          productName: nozzle.fuelType.name,
          productCode: nozzle.fuelType.code,
          suggestedOpening: suggested,
        };
      }),
      tanks: tanks.map((tank) => {
        const prior = tankById.get(tank.id);
        const suggested = previousClosed
          ? num(prior?.closingStock ?? prior?.openingStock ?? tank.currentStock)
          : num(tank.currentStock);
        return {
          tankId: tank.id,
          tankName: tank.name,
          productName: tank.fuelType.name,
          productCode: tank.fuelType.code,
          suggestedOpening: suggested,
        };
      }),
    });
  });

  app.get('/api/v1/fuel/days', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z
      .object({ stationId: id.optional(), status: z.enum(['OPEN', 'CLOSED']).optional() })
      .parse(request.query);
    const days = await prisma.businessDay.findMany({
      where: {
        station: { businessId: user.main_business_id },
        ...(query.stationId ? { stationId: query.stationId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: dayInclude,
      orderBy: { businessDate: 'desc' },
      take: 14,
    });
    return reply.send(days.map(serializeDay));
  });

  app.post('/api/v1/fuel/days', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    if (!['owner', 'manager', 'staff'].includes(user.role)) {
      reply.code(403).send({ message: 'Your role cannot open a working day.' });
      return;
    }
    const input = z
      .object({
        stationId: id,
        businessDate: ymd,
        bbfCash: z.number().nonnegative(),
        overrideReason: z.string().min(8).max(240).optional(),
        meters: z.array(z.object({ nozzleId: id, openingReading: z.number().nonnegative() })),
        tanks: z.array(z.object({ tankId: id, openingStock: z.number().nonnegative() })),
      })
      .parse(request.body);

    const station = await prisma.station.findFirst({
      where: { id: input.stationId, businessId: user.main_business_id },
    });
    if (!station) return reply.code(404).send({ message: 'Station not found.' });

    const businessDate = toDate(input.businessDate);
    const already = await prisma.businessDay.findUnique({
      where: { stationId_businessDate: { stationId: station.id, businessDate } },
    });
    if (already) return reply.code(409).send({ message: 'This business date is already opened.' });

    const previous = await prisma.businessDay.findFirst({
      where: { stationId: station.id, businessDate: { lt: businessDate } },
      orderBy: { businessDate: 'desc' },
    });
    if (previous && previous.status !== 'CLOSED') {
      if (user.role !== 'owner') {
        return reply.code(409).send({
          message: `Previous day ${toYmd(previous.businessDate)} must be closed before opening a new day.`,
        });
      }
      if (!input.overrideReason) {
        return reply.code(400).send({
          message: 'Owner override requires a reason when the previous day is still open.',
        });
      }
    }

    const day = await prisma.$transaction(async (tx) => {
      const created = await tx.businessDay.create({
        data: {
          id: randomUUID(),
          stationId: station.id,
          businessDate,
          bbfCash: input.bbfCash,
          openedBy: user.id,
          overrideReason: input.overrideReason,
          meters: {
            create: input.meters.map((row) => ({
              id: randomUUID(),
              nozzleId: row.nozzleId,
              openingReading: row.openingReading,
            })),
          },
          tanks: {
            create: input.tanks.map((row) => ({
              id: randomUUID(),
              tankId: row.tankId,
              openingStock: row.openingStock,
            })),
          },
        },
        include: dayInclude,
      });

      await Promise.all(
        input.meters.map((row) =>
          tx.nozzle.update({
            where: { id: row.nozzleId },
            data: { openingMeter: row.openingReading },
          })
        )
      );
      await Promise.all(
        input.tanks.map((row) =>
          tx.tank.update({
            where: { id: row.tankId },
            data: { openingStock: row.openingStock },
          })
        )
      );
      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          businessId: user.main_business_id,
          userId: user.id,
          action: 'OPEN',
          entityType: 'BUSINESS_DAY',
          entityId: created.id,
          details: {
            businessDate: input.businessDate,
            override: Boolean(input.overrideReason),
          },
        },
      });
      return created;
    });

    return reply.code(201).send(serializeDay(day));
  });
};
