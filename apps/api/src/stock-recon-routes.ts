import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { User as AuthUser } from '@companyio/auth-contracts';
import { sendApiError } from './http-errors.ts';
import { computeTankStockRecon, round3 } from './stock-recon.ts';

type Authenticator = (authorization?: string) => Promise<AuthUser | null>;

const id = z.string().min(1);
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const num = (value: unknown) => Number(value);

const requireUser = async (
  request: FastifyRequest,
  reply: FastifyReply,
  authenticate: Authenticator
) => {
  const user = await authenticate(request.headers.authorization);
  if (!user || !user.id || !user.main_business_id) {
    reply.code(401).send({ message: 'Authentication required.' });
    return null;
  }
  return user;
};

const buildSummary = async (prisma: PrismaClient, stationId: string, businessDateYmd: string) => {
  const businessDate = new Date(`${businessDateYmd}T00:00:00.000Z`);
  const day = await prisma.businessDay.findUnique({
    where: {
      stationId_businessDate: { stationId, businessDate },
    },
    include: {
      tanks: {
        include: {
          tank: { include: { fuelType: { select: { id: true, name: true, code: true } } } },
        },
        orderBy: { tank: { name: 'asc' } },
      },
    },
  });

  if (!day) {
    return {
      stationId,
      businessDate: businessDateYmd,
      businessDayId: null as string | null,
      status: null as string | null,
      tanks: [] as Array<Record<string, unknown>>,
      unexplainedCount: 0,
      message: 'Open this business day first (Daily opening) to see stock reconciliation.',
    };
  }

  const isOpenDay = day.status === 'OPEN';
  const tanks = [];

  for (const dayTank of day.tanks) {
    const computed = await computeTankStockRecon(prisma, {
      businessDayId: day.id,
      stationId,
      tankId: dayTank.tankId,
      openingStock: num(dayTank.openingStock),
      returnLitres: num(dayTank.returnLitres),
      businessDateYmd,
    });

    await prisma.businessDayTank.update({
      where: { id: dayTank.id },
      data: { closingStock: computed.closingStock },
    });

    const bookStock = round3(num(dayTank.tank.currentStock));
    const difference = isOpenDay ? round3(bookStock - computed.closingStock) : 0;
    const hasUnexplained = Math.abs(difference) > 0.001;

    tanks.push({
      tankId: dayTank.tankId,
      tankName: dayTank.tank.name,
      productName: dayTank.tank.fuelType.name,
      productCode: dayTank.tank.fuelType.code,
      openingStock: computed.openingStock,
      received: computed.received,
      returnLitres: computed.returnLitres,
      total: computed.total,
      saleOfDay: computed.saleOfDay,
      closingStock: computed.closingStock,
      bookStock,
      difference,
      hasUnexplained,
    });
  }

  return {
    stationId,
    businessDate: businessDateYmd,
    businessDayId: day.id,
    status: day.status,
    tanks,
    unexplainedCount: tanks.filter((row) => row.hasUnexplained).length,
  };
};

export const registerStockReconRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  authenticate: Authenticator
) => {
  app.get('/api/v1/fuel/stock-reconciliation', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;

    const query = z
      .object({
        stationId: id,
        businessDate: ymd,
      })
      .parse(request.query);

    const station = await prisma.station.findFirst({
      where: { id: query.stationId, businessId: user.main_business_id },
    });
    if (!station) return sendApiError(reply, 404, 'Station not found.', { code: 'NOT_FOUND' });

    return reply.send(await buildSummary(prisma, station.id, query.businessDate));
  });

  /** Update Return litres for tanks (paper column). Adjusts tank stock by the delta. */
  app.put('/api/v1/fuel/stock-reconciliation/returns', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    if (!['owner', 'manager', 'staff'].includes(user.role)) {
      return sendApiError(reply, 403, 'Your role cannot update stock returns.', {
        code: 'FORBIDDEN',
      });
    }

    const input = z
      .object({
        stationId: id,
        businessDate: ymd,
        returns: z
          .array(
            z.object({
              tankId: id,
              returnLitres: z.number().min(0).max(1_000_000),
            })
          )
          .min(1)
          .max(50),
      })
      .parse(request.body);

    const station = await prisma.station.findFirst({
      where: { id: input.stationId, businessId: user.main_business_id },
    });
    if (!station) return sendApiError(reply, 404, 'Station not found.', { code: 'NOT_FOUND' });

    const businessDate = new Date(`${input.businessDate}T00:00:00.000Z`);
    const day = await prisma.businessDay.findUnique({
      where: {
        stationId_businessDate: { stationId: station.id, businessDate },
      },
    });
    if (!day) {
      return sendApiError(reply, 404, 'Open this business day first.', { code: 'NOT_FOUND' });
    }
    if (day.status !== 'OPEN') {
      return sendApiError(reply, 409, 'This business day is closed.', { code: 'DAY_CLOSED' });
    }

    try {
      await prisma.$transaction(async (tx) => {
        for (const row of input.returns) {
          const dayTank = await tx.businessDayTank.findUnique({
            where: {
              businessDayId_tankId: { businessDayId: day.id, tankId: row.tankId },
            },
            include: { tank: true },
          });
          if (!dayTank || dayTank.tank.stationId !== station.id) {
            throw Object.assign(new Error('Tank not on this business day.'), { statusCode: 400 });
          }

          const previous = num(dayTank.returnLitres);
          const next = round3(row.returnLitres);
          const delta = round3(next - previous);
          if (delta === 0) continue;

          if (delta > 0 && num(dayTank.tank.currentStock) < delta) {
            throw Object.assign(
              new Error(`Insufficient stock in ${dayTank.tank.name} for this return.`),
              { statusCode: 400 }
            );
          }

          const updatedTank = await tx.tank.update({
            where: { id: row.tankId },
            data: { currentStock: { decrement: delta } },
          });

          await tx.businessDayTank.update({
            where: { id: dayTank.id },
            data: { returnLitres: next },
          });

          await tx.inventoryMovement.create({
            data: {
              id: randomUUID(),
              stationId: station.id,
              tankId: row.tankId,
              fuelTypeId: dayTank.tank.fuelTypeId,
              sourceType: 'RETURN',
              sourceId: dayTank.id,
              quantity: -delta,
              balanceAfter: updatedTank.currentStock,
            },
          });

          const computed = await computeTankStockRecon(tx, {
            businessDayId: day.id,
            stationId: station.id,
            tankId: row.tankId,
            openingStock: num(dayTank.openingStock),
            returnLitres: next,
            businessDateYmd: input.businessDate,
          });
          await tx.businessDayTank.update({
            where: { id: dayTank.id },
            data: { closingStock: computed.closingStock },
          });
        }
      });
    } catch (error) {
      const status =
        typeof (error as { statusCode?: unknown }).statusCode === 'number'
          ? (error as { statusCode: number }).statusCode
          : 500;
      if (status < 500) {
        return sendApiError(reply, status, (error as Error).message, { code: 'BAD_REQUEST' });
      }
      throw error;
    }

    return reply.send(await buildSummary(prisma, station.id, input.businessDate));
  });
};
