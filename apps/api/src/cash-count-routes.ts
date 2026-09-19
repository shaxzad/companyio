import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { User as AuthUser } from '@companyio/auth-contracts';
import { sendApiError } from './http-errors.ts';
import { assertDayChangeAllowed, writeAuditLog } from './audit.ts';

type Authenticator = (authorization?: string) => Promise<AuthUser | null>;

const id = z.string().min(1);
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

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

const num = (value: unknown) => Number(value);

const serializeCount = (row: {
  id: string;
  stationId: string;
  businessDate: Date;
  totalCash: unknown;
  countedBy: string;
  countedAt: Date;
  updatedAt: Date;
  lines: Array<{
    id: string;
    denominationId: string | null;
    faceValue: number;
    quantity: number;
    amount: unknown;
  }>;
}) => ({
  id: row.id,
  stationId: row.stationId,
  businessDate: row.businessDate.toISOString().slice(0, 10),
  totalCash: Math.round(num(row.totalCash) * 100) / 100,
  countedBy: row.countedBy,
  countedAt: row.countedAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  lines: row.lines
    .map((line) => ({
      id: line.id,
      denominationId: line.denominationId,
      faceValue: line.faceValue,
      quantity: line.quantity,
      amount: Math.round(num(line.amount) * 100) / 100,
    }))
    .sort((a, b) => b.faceValue - a.faceValue),
});

export const registerCashCountRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  authenticate: Authenticator
) => {
  app.get('/api/v1/fuel/cash-counts', async (request, reply) => {
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

    const businessDate = new Date(`${query.businessDate}T00:00:00.000Z`);
    const existing = await prisma.cashCount.findUnique({
      where: {
        stationId_businessDate: {
          stationId: station.id,
          businessDate,
        },
      },
      include: { lines: true },
    });

    if (!existing) {
      return reply.send({
        stationId: station.id,
        businessDate: query.businessDate,
        totalCash: 0,
        countedBy: null,
        countedAt: null,
        updatedAt: null,
        lines: [],
      });
    }

    return reply.send(serializeCount(existing));
  });

  app.put('/api/v1/fuel/cash-counts', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;

    const input = z
      .object({
        stationId: id,
        businessDate: ymd,
        auditReason: z.string().min(8).max(500).optional(),
        lines: z
          .array(
            z.object({
              denominationId: id,
              quantity: z.number().int().min(0).max(1_000_000),
            })
          )
          .max(50),
      })
      .parse(request.body);

    const station = await prisma.station.findFirst({
      where: { id: input.stationId, businessId: user.main_business_id },
    });
    if (!station) return sendApiError(reply, 404, 'Station not found.', { code: 'NOT_FOUND' });

    const lock = await assertDayChangeAllowed(prisma, reply, {
      stationId: station.id,
      businessDateYmd: input.businessDate,
      auditReason: input.auditReason,
    });
    if (!lock.allowed) return;

    const denominationIds = [...new Set(input.lines.map((line) => line.denominationId))];
    const denominations = await prisma.cashDenomination.findMany({
      where: {
        businessId: user.main_business_id,
        id: { in: denominationIds },
        active: true,
      },
    });
    if (denominations.length !== denominationIds.length) {
      return sendApiError(reply, 400, 'One or more denominations are missing or inactive.', {
        code: 'INVALID_DENOMINATION',
        fields: { lines: 'Use only active cash notes from Settings.' },
      });
    }

    const byId = new Map(denominations.map((row) => [row.id, row]));
    const built = input.lines.map((line) => {
      const denom = byId.get(line.denominationId)!;
      const faceValue = denom.value;
      const quantity = line.quantity;
      const amount = Math.round(quantity * faceValue * 100) / 100;
      return {
        denominationId: denom.id,
        faceValue,
        quantity,
        amount,
      };
    });

    const totalCash = Math.round(built.reduce((sum, line) => sum + line.amount, 0) * 100) / 100;
    const businessDate = new Date(`${input.businessDate}T00:00:00.000Z`);

    const saved = await prisma.$transaction(async (tx) => {
      const existing = await tx.cashCount.findUnique({
        where: {
          stationId_businessDate: {
            stationId: station.id,
            businessDate,
          },
        },
      });

      if (existing) {
        await tx.cashCountLine.deleteMany({ where: { cashCountId: existing.id } });
        return tx.cashCount.update({
          where: { id: existing.id },
          data: {
            totalCash,
            countedBy: user.id,
            countedAt: new Date(),
            lines: {
              create: built.map((line) => ({
                id: randomUUID(),
                denominationId: line.denominationId,
                faceValue: line.faceValue,
                quantity: line.quantity,
                amount: line.amount,
              })),
            },
          },
          include: { lines: true },
        });
      }

      return tx.cashCount.create({
        data: {
          id: randomUUID(),
          stationId: station.id,
          businessDate,
          totalCash,
          countedBy: user.id,
          lines: {
            create: built.map((line) => ({
              id: randomUUID(),
              denominationId: line.denominationId,
              faceValue: line.faceValue,
              quantity: line.quantity,
              amount: line.amount,
            })),
          },
        },
        include: { lines: true },
      });
    });

    if (lock.reason) {
      await writeAuditLog(prisma, {
        businessId: user.main_business_id,
        userId: user.id,
        action: 'UPDATE',
        entityType: 'CASH_COUNT',
        entityId: saved.id,
        details: {
          reason: lock.reason,
          dayStatus: lock.dayStatus,
          businessDate: input.businessDate,
          after: { totalCash, lineCount: built.length },
        },
      });
    }

    return reply.send(serializeCount(saved));
  });
};
