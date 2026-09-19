import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { User as AuthUser } from '@companyio/auth-contracts';
import { sendApiError } from './http-errors.ts';
import { computeCashReconciliation, round2 } from './cash-recon.ts';
import { computeTankStockRecon, karachiDayBounds, round3, toYmdKarachi } from './stock-recon.ts';

type Authenticator = (authorization?: string) => Promise<AuthUser | null>;

const id = z.string().min(1);
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

const addDaysYmd = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

async function cashSnapshot(
  prisma: PrismaClient,
  stationId: string,
  businessDateYmd: string,
  dayId: string | null,
  bbfCash: number
) {
  const { start, end } = karachiDayBounds(businessDateYmd);
  const businessDate = new Date(`${businessDateYmd}T00:00:00.000Z`);

  const [cashSales, creditAgg, cashPaidOutAgg, onlinePayments, cashCount] = await Promise.all([
    prisma.sale.findMany({
      where: {
        stationId,
        status: 'CONFIRMED',
        saleType: 'CASH',
        ...(dayId
          ? {
              OR: [
                { businessDayId: dayId },
                { businessDayId: null, soldAt: { gte: start, lte: end } },
              ],
            }
          : { soldAt: { gte: start, lte: end } }),
      },
      include: {
        lines: { include: { fuelType: { select: { code: true, name: true } } } },
      },
    }),
    prisma.sale.aggregate({
      where: {
        stationId,
        status: 'CONFIRMED',
        saleType: 'CREDIT',
        soldAt: { gte: start, lte: end },
      },
      _sum: { totalAmount: true },
    }),
    prisma.expense.aggregate({
      where: {
        stationId,
        spentAt: { gte: start, lte: end },
        paidFromTodaysCash: true,
      },
      _sum: { amount: true },
    }),
    prisma.payment.findMany({
      where: {
        stationId,
        paidAt: { gte: start, lte: end },
        OR: [
          { paymentAccount: { kind: { in: [...ONLINE_KINDS] } } },
          { paymentAccountId: null, method: { in: [...ONLINE_KINDS] } },
        ],
      },
      select: { amount: true },
    }),
    prisma.cashCount.findUnique({
      where: { stationId_businessDate: { stationId, businessDate } },
      select: { totalCash: true },
    }),
  ]);

  const byProduct = new Map<string, { productCode: string; productName: string; amount: number }>();
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

  return {
    ...computeCashReconciliation({
      productSales: [...byProduct.values()],
      bbfCash,
      creditSalesTotal: num(creditAgg._sum.totalAmount),
      cashPaidOutTotal: num(cashPaidOutAgg._sum.amount),
      actualCashCounted: cashCount ? num(cashCount.totalCash) : 0,
      onlinePaymentsTotal: round2(
        onlinePayments.reduce((sum, payment) => sum + num(payment.amount), 0)
      ),
    }),
    cashCountSaved: Boolean(cashCount),
  };
}

async function stockUnexplainedCount(
  prisma: PrismaClient,
  stationId: string,
  businessDateYmd: string,
  dayId: string
) {
  const dayTanks = await prisma.businessDayTank.findMany({
    where: { businessDayId: dayId },
    include: { tank: { select: { currentStock: true } } },
  });
  let unexplained = 0;
  for (const dayTank of dayTanks) {
    const computed = await computeTankStockRecon(prisma, {
      businessDayId: dayId,
      stationId,
      tankId: dayTank.tankId,
      openingStock: num(dayTank.openingStock),
      returnLitres: num(dayTank.returnLitres),
      businessDateYmd,
    });
    const difference = round3(num(dayTank.tank.currentStock) - computed.closingStock);
    if (Math.abs(difference) > 0.001) unexplained += 1;
  }
  return unexplained;
}

export const registerDashboardRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  authenticate: Authenticator
) => {
  app.get('/api/v1/fuel/dashboard', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;

    const query = z.object({ stationId: id.optional() }).parse(request.query);
    const station = query.stationId
      ? await prisma.station.findFirst({
          where: { id: query.stationId, businessId: user.main_business_id },
        })
      : await prisma.station.findFirst({
          where: { businessId: user.main_business_id, active: true },
          orderBy: { name: 'asc' },
        });
    if (!station) return sendApiError(reply, 404, 'Station not found.', { code: 'NOT_FOUND' });

    const todayYmd = toYmdKarachi(new Date());
    const { start: todayStart, end: todayEnd } = karachiDayBounds(todayYmd);
    const weekFromYmd = addDaysYmd(todayYmd, -6);
    const weekStart = karachiDayBounds(weekFromYmd).start;

    const businessDate = new Date(`${todayYmd}T00:00:00.000Z`);
    const day = await prisma.businessDay.findUnique({
      where: { stationId_businessDate: { stationId: station.id, businessDate } },
    });

    const [salesToday, salesWeek, receipts, payments, expenses, tanks, organizations] =
      await Promise.all([
        prisma.sale.aggregate({
          where: {
            stationId: station.id,
            status: 'CONFIRMED',
            soldAt: { gte: todayStart, lte: todayEnd },
          },
          _sum: { totalAmount: true, totalLitres: true },
          _count: true,
        }),
        prisma.sale.aggregate({
          where: {
            stationId: station.id,
            status: 'CONFIRMED',
            soldAt: { gte: weekStart, lte: todayEnd },
          },
          _sum: { totalAmount: true, totalLitres: true },
        }),
        prisma.fuelReceipt.aggregate({
          where: {
            stationId: station.id,
            receivedAt: { gte: todayStart, lte: todayEnd },
            status: 'CONFIRMED',
          },
          _sum: { totalCost: true },
        }),
        prisma.payment.aggregate({
          where: { stationId: station.id, paidAt: { gte: todayStart, lte: todayEnd } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { stationId: station.id, spentAt: { gte: todayStart, lte: todayEnd } },
          _sum: { amount: true },
        }),
        prisma.tank.findMany({
          where: { stationId: station.id, active: true },
          include: { fuelType: true },
          orderBy: { name: 'asc' },
        }),
        prisma.organization.findMany({
          where: { businessId: user.main_business_id, active: true },
          include: {
            sales: {
              where: { saleType: 'CREDIT', status: 'CONFIRMED' },
              select: { totalAmount: true },
            },
            payments: { select: { amount: true } },
          },
        }),
      ]);

    const creditOutstanding = round2(
      organizations.reduce((total, organization) => {
        const opening = num(organization.openingBalance);
        const salesTotal = organization.sales.reduce((sum, sale) => sum + num(sale.totalAmount), 0);
        const paymentsTotal = organization.payments.reduce(
          (sum, payment) => sum + num(payment.amount),
          0
        );
        return total + opening + salesTotal - paymentsTotal;
      }, 0)
    );

    const cash = day
      ? await cashSnapshot(prisma, station.id, todayYmd, day.id, num(day.bbfCash))
      : null;

    const unexplainedStock =
      day && day.status === 'OPEN'
        ? await stockUnexplainedCount(prisma, station.id, todayYmd, day.id)
        : 0;

    const flags: Array<{
      code: string;
      severity: 'warning' | 'error' | 'info';
      label: string;
      href: string;
      detail: string;
    }> = [];

    if (!day) {
      flags.push({
        code: 'DAY_NOT_OPEN',
        severity: 'warning',
        label: 'Business day not open',
        href: '/opening',
        detail: 'Open today’s business day before recording sales.',
      });
    } else {
      if (day.status === 'OPEN') {
        flags.push({
          code: 'DAY_OPEN',
          severity: 'info',
          label: 'Day is open',
          href: '/closing',
          detail: 'Complete cash count, recon, and closing when ready.',
        });
      } else if (day.status === 'RECONCILED') {
        flags.push({
          code: 'DAY_RECONCILED',
          severity: 'warning',
          label: 'Awaiting close',
          href: '/closing',
          detail: 'Day is reconciled — owner/manager can approve & close.',
        });
      }

      if (cash?.hasDifference) {
        flags.push({
          code: 'CASH_DIFFERENCE',
          severity: 'error',
          label: 'Cash difference',
          href: '/cash-recon',
          detail: `Expected vs counted/online differs by ${cash.difference.toFixed(2)}.`,
        });
      }

      if (unexplainedStock > 0) {
        flags.push({
          code: 'STOCK_UNEXPLAINED',
          severity: 'error',
          label: 'Stock variance',
          href: '/inventory',
          detail: `${unexplainedStock} tank(s) have unexplained book vs closing difference.`,
        });
      }

      if (cash && !cash.cashCountSaved && day.status === 'OPEN') {
        flags.push({
          code: 'CASH_COUNT_MISSING',
          severity: 'warning',
          label: 'Cash count not saved',
          href: '/cash-count',
          detail: 'Enter today’s denomination count before closing.',
        });
      }
    }

    return reply.send({
      station: { id: station.id, name: station.name, code: station.code },
      businessDate: todayYmd,
      day: day
        ? {
            id: day.id,
            status: day.status,
            bbfCash: num(day.bbfCash),
          }
        : null,
      today: {
        sales: num(salesToday._sum.totalAmount),
        litres: num(salesToday._sum.totalLitres),
        transactions: salesToday._count,
        receivedCost: num(receipts._sum.totalCost),
        payments: num(payments._sum.amount),
        expenses: num(expenses._sum.amount),
        creditOutstanding,
      },
      week: {
        from: weekFromYmd,
        to: todayYmd,
        sales: num(salesWeek._sum.totalAmount),
        litres: num(salesWeek._sum.totalLitres),
      },
      cash: cash
        ? {
            saleTotal: cash.saleTotal,
            bbfCash: cash.bbfCash,
            expectedCashInHand: cash.expectedCashInHand,
            actualCashCounted: cash.actualCashCounted,
            onlinePaymentsTotal: cash.onlinePaymentsTotal,
            difference: cash.difference,
            hasDifference: cash.hasDifference,
          }
        : null,
      flags,
      tanks: tanks.map((tank) => ({
        id: tank.id,
        name: tank.name,
        currentStock: num(tank.currentStock),
        capacity: num(tank.capacity),
        fuelType: {
          name: tank.fuelType.name,
          sellingPrice: String(tank.fuelType.sellingPrice),
        },
      })),
    });
  });
};
