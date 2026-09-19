import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { User as AuthUser } from '@companyio/auth-contracts';
import { sendApiError } from './http-errors.ts';
import { computeCashReconciliation, round2 } from './cash-recon.ts';
import { karachiDayBounds, toYmdKarachi } from './stock-recon.ts';

type Authenticator = (authorization?: string) => Promise<AuthUser | null>;

const id = z.string().min(1);
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const num = (value: unknown) => Number(value ?? 0);

const ONLINE_KINDS = ['BANK', 'CARD', 'TRANSFER'] as const;

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

export const registerCashReconRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  authenticate: Authenticator
) => {
  app.get('/api/v1/fuel/cash-reconciliation', async (request, reply) => {
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
    const day = await prisma.businessDay.findUnique({
      where: {
        stationId_businessDate: { stationId: station.id, businessDate },
      },
    });

    if (!day) {
      return reply.send({
        stationId: station.id,
        businessDate: query.businessDate,
        businessDayId: null,
        status: null,
        message: 'Open this business day first (Daily opening) to run cash reconciliation.',
        inputs: null,
        result: null,
      });
    }

    const { start, end } = karachiDayBounds(query.businessDate);

    const [cashSales, creditAgg, cashPaidOutAgg, onlinePayments, cashCount] = await Promise.all([
      prisma.sale.findMany({
        where: {
          stationId: station.id,
          status: 'CONFIRMED',
          saleType: 'CASH',
          OR: [
            { businessDayId: day.id },
            { businessDayId: null, soldAt: { gte: start, lte: end } },
          ],
        },
        include: {
          lines: { include: { fuelType: { select: { code: true, name: true } } } },
        },
      }),
      prisma.sale.aggregate({
        where: {
          stationId: station.id,
          status: 'CONFIRMED',
          saleType: 'CREDIT',
          soldAt: { gte: start, lte: end },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: {
          stationId: station.id,
          spentAt: { gte: start, lte: end },
          paidFromTodaysCash: true,
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.findMany({
        where: {
          stationId: station.id,
          paidAt: { gte: start, lte: end },
          OR: [
            { paymentAccount: { kind: { in: [...ONLINE_KINDS] } } },
            { paymentAccountId: null, method: { in: [...ONLINE_KINDS] } },
          ],
        },
        select: { amount: true },
      }),
      prisma.cashCount.findUnique({
        where: {
          stationId_businessDate: {
            stationId: station.id,
            businessDate,
          },
        },
        select: { totalCash: true, countedAt: true, updatedAt: true },
      }),
    ]);

    const byProduct = new Map<
      string,
      { productCode: string; productName: string; amount: number }
    >();
    for (const sale of cashSales) {
      for (const line of sale.lines) {
        const code = line.fuelType.code;
        const current = byProduct.get(code) ?? {
          productCode: code,
          productName: line.fuelType.name,
          amount: 0,
        };
        current.amount = round2(current.amount + num(line.amount));
        byProduct.set(code, current);
      }
    }

    const productSales = [...byProduct.values()].sort((a, b) =>
      a.productName.localeCompare(b.productName)
    );

    const result = computeCashReconciliation({
      productSales,
      bbfCash: num(day.bbfCash),
      creditSalesTotal: num(creditAgg._sum.totalAmount),
      cashPaidOutTotal: num(cashPaidOutAgg._sum.amount),
      actualCashCounted: cashCount ? num(cashCount.totalCash) : 0,
      onlinePaymentsTotal: round2(
        onlinePayments.reduce((sum, payment) => sum + num(payment.amount), 0)
      ),
    });

    return reply.send({
      stationId: station.id,
      businessDate: query.businessDate,
      businessDayId: day.id,
      status: day.status,
      businessDateLabel: toYmdKarachi(day.businessDate),
      inputs: {
        productSales: result.productSales,
        saleTotal: result.saleTotal,
        bbfCash: result.bbfCash,
        creditSalesTotal: result.creditSalesTotal,
        creditSalesCount: creditAgg._count,
        cashPaidOutTotal: result.cashPaidOutTotal,
        cashPaidOutCount: cashPaidOutAgg._count,
        actualCashCounted: result.actualCashCounted,
        cashCountedAt: cashCount?.countedAt?.toISOString() ?? null,
        onlinePaymentsTotal: result.onlinePaymentsTotal,
        onlinePaymentsCount: onlinePayments.length,
      },
      result: {
        total: result.total,
        expectedCashInHand: result.expectedCashInHand,
        actualPlusOnline: result.actualPlusOnline,
        difference: result.difference,
        hasDifference: result.hasDifference,
      },
      formula: {
        total: 'Sale (all products) + BBF Cash',
        expectedCashInHand: 'Total − Credit sales (F7) − Cash paid out (F9)',
        difference: 'Expected − (Actual cash counted + Online payments)',
      },
    });
  });
};
