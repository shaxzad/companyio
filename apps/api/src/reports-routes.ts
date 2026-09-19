import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { User as AuthUser } from '@companyio/auth-contracts';
import { sendApiError } from './http-errors.ts';
import { computeCashReconciliation, round2 } from './cash-recon.ts';
import { computeDailyPnl, parsePnlSettings, round2 as pnlRound2 } from './pnl.ts';
import { computeTankStockRecon, karachiDayBounds, round3, toYmdKarachi } from './stock-recon.ts';

type Authenticator = (authorization?: string) => Promise<AuthUser | null>;

const id = z.string().min(1);
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const yearMonth = z.string().regex(/^\d{4}-\d{2}$/);
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

const eachYmd = (from: string, to: string) => {
  const dates: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    dates.push(cursor);
    cursor = addDaysYmd(cursor, 1);
  }
  return dates;
};

const monthBounds = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  const from = `${ym}-01`;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${ym}-${String(last).padStart(2, '0')}`;
  return { from, to };
};

const assertStation = async (prisma: PrismaClient, businessId: string, stationId: string) =>
  prisma.station.findFirst({ where: { id: stationId, businessId } });

async function loadDayCashInputs(
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
      _sum: { totalAmount: true, totalLitres: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: {
        stationId,
        spentAt: { gte: start, lte: end },
        paidFromTodaysCash: true,
      },
      _sum: { amount: true },
      _count: true,
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
  let cashLitres = 0;
  let cashAmount = 0;
  for (const sale of cashSales) {
    cashAmount = round2(cashAmount + num(sale.totalAmount));
    cashLitres = round3(cashLitres + num(sale.totalLitres));
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
    bbfCash,
    creditSalesTotal: num(creditAgg._sum.totalAmount),
    cashPaidOutTotal: num(cashPaidOutAgg._sum.amount),
    actualCashCounted: cashCount ? num(cashCount.totalCash) : 0,
    onlinePaymentsTotal: round2(
      onlinePayments.reduce((sum, payment) => sum + num(payment.amount), 0)
    ),
  });

  return {
    cashLitres,
    cashAmount,
    creditLitres: num(creditAgg._sum.totalLitres),
    creditAmount: num(creditAgg._sum.totalAmount),
    creditCount: creditAgg._count,
    cashPaidOutCount: cashPaidOutAgg._count,
    onlinePaymentsCount: onlinePayments.length,
    result,
  };
}

async function loadDayPnl(
  prisma: PrismaClient,
  businessId: string,
  stationId: string,
  businessDateYmd: string,
  dayId: string | null
) {
  const { start, end } = karachiDayBounds(businessDateYmd);
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { settings: true },
  });
  const settings = parsePnlSettings(business?.settings);

  const [cashSales, creditSales, onlinePayments, receipts, expenses, fuelTypes] = await Promise.all(
    [
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
          lines: {
            include: { fuelType: { select: { id: true, code: true, purchasePrice: true } } },
          },
        },
      }),
      prisma.sale.findMany({
        where: {
          stationId,
          status: 'CONFIRMED',
          saleType: 'CREDIT',
          soldAt: { gte: start, lte: end },
        },
        include: {
          lines: {
            include: { fuelType: { select: { id: true, code: true, purchasePrice: true } } },
          },
        },
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
      prisma.fuelReceipt.findMany({
        where: {
          stationId,
          ...(dayId
            ? {
                OR: [
                  { businessDayId: dayId },
                  { businessDayId: null, receivedAt: { gte: start, lte: end } },
                ],
              }
            : { receivedAt: { gte: start, lte: end } }),
        },
        select: {
          accessLitres: true,
          accessRate: true,
          tankerTip: true,
        },
      }),
      prisma.expense.findMany({
        where: { stationId, spentAt: { gte: start, lte: end } },
        include: { expenseCategory: { select: { code: true } } },
      }),
      prisma.fuelType.findMany({
        where: { businessId },
        select: { id: true, purchasePrice: true, sellingPrice: true },
      }),
    ]
  );

  const purchaseByFuel = new Map(
    fuelTypes.map((row) => [
      row.id,
      { purchase: num(row.purchasePrice), selling: num(row.sellingPrice) },
    ])
  );

  let cashSalesRevenue = 0;
  let creditSalesRevenue = 0;
  let fuelCost = 0;
  let priceGainLoss = 0;

  const applySaleLines = (sales: typeof cashSales, onRevenue: (amount: number) => void) => {
    for (const sale of sales) {
      onRevenue(num(sale.totalAmount));
      for (const line of sale.lines) {
        const litres = num(line.litres);
        const catalog = purchaseByFuel.get(line.fuelTypeId);
        const unitCost = num(line.fuelType.purchasePrice ?? catalog?.purchase ?? 0);
        const selling = catalog?.selling ?? 0;
        fuelCost = pnlRound2(fuelCost + litres * unitCost);
        priceGainLoss = pnlRound2(priceGainLoss + litres * (selling - unitCost));
      }
    }
  };

  applySaleLines(cashSales, (amount) => {
    cashSalesRevenue = pnlRound2(cashSalesRevenue + amount);
  });
  applySaleLines(creditSales, (amount) => {
    creditSalesRevenue = pnlRound2(creditSalesRevenue + amount);
  });

  let accessGain = 0;
  let tankerTipTotal = 0;
  for (const receipt of receipts) {
    accessGain = pnlRound2(accessGain + num(receipt.accessLitres) * num(receipt.accessRate));
    tankerTipTotal = pnlRound2(tankerTipTotal + num(receipt.tankerTip));
  }

  const tipCategoryCodes = new Set(['TANKER_TIP', 'TANKER-TIP', 'TIP']);
  let otherExpenses = 0;
  for (const expense of expenses) {
    const code = (expense.expenseCategory?.code ?? '').toUpperCase();
    if (settings.tankerTipInPnl === 'SEPARATE' && tipCategoryCodes.has(code)) continue;
    otherExpenses = pnlRound2(otherExpenses + num(expense.amount));
  }

  const result = computeDailyPnl({
    cashSalesRevenue,
    creditSalesRevenue,
    onlinePaymentsTotal: pnlRound2(
      onlinePayments.reduce((sum, payment) => sum + num(payment.amount), 0)
    ),
    fuelCost,
    tankerTipTotal,
    otherExpenses,
    accessGain,
    priceGainLoss,
    settings,
  });

  return result;
}

async function loadDayStock(
  prisma: PrismaClient,
  stationId: string,
  businessDateYmd: string,
  dayId: string
) {
  const dayTanks = await prisma.businessDayTank.findMany({
    where: { businessDayId: dayId },
    include: {
      tank: { include: { fuelType: { select: { name: true, code: true } } } },
    },
    orderBy: { tank: { name: 'asc' } },
  });

  const tanks = [];
  for (const dayTank of dayTanks) {
    const computed = await computeTankStockRecon(prisma, {
      businessDayId: dayId,
      stationId,
      tankId: dayTank.tankId,
      openingStock: num(dayTank.openingStock),
      returnLitres: num(dayTank.returnLitres),
      businessDateYmd,
    });
    tanks.push({
      tankId: dayTank.tankId,
      tankName: dayTank.tank.name,
      productName: dayTank.tank.fuelType.name,
      productCode: dayTank.tank.fuelType.code,
      openingStock: computed.openingStock,
      received: computed.received,
      returnLitres: computed.returnLitres,
      saleOfDay: computed.saleOfDay,
      closingStock: computed.closingStock,
    });
  }
  return tanks;
}

export const registerReportsRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  authenticate: Authenticator
) => {
  app.get('/api/v1/fuel/reports/daily', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z.object({ stationId: id, businessDate: ymd }).parse(request.query);

    const station = await assertStation(prisma, user.main_business_id, query.stationId);
    if (!station) return sendApiError(reply, 404, 'Station not found.', { code: 'NOT_FOUND' });

    const businessDate = new Date(`${query.businessDate}T00:00:00.000Z`);
    const day = await prisma.businessDay.findUnique({
      where: { stationId_businessDate: { stationId: station.id, businessDate } },
    });

    if (!day) {
      return reply.send({
        report: 'daily',
        station: { id: station.id, name: station.name },
        businessDate: query.businessDate,
        status: null,
        message: 'Open this business day first to generate the daily report.',
        sales: null,
        cash: null,
        stock: null,
        expenses: null,
        advances: null,
        pnl: null,
      });
    }

    const { start, end } = karachiDayBounds(query.businessDate);
    const [cashBundle, pnl, stock, expenseRows, advanceAgg] = await Promise.all([
      loadDayCashInputs(prisma, station.id, query.businessDate, day.id, num(day.bbfCash)),
      loadDayPnl(prisma, user.main_business_id, station.id, query.businessDate, day.id),
      loadDayStock(prisma, station.id, query.businessDate, day.id),
      prisma.expense.findMany({
        where: { stationId: station.id, spentAt: { gte: start, lte: end } },
        include: { expenseCategory: { select: { name: true, code: true } } },
        orderBy: { spentAt: 'asc' },
      }),
      prisma.obligationPayment.aggregate({
        where: {
          paidAt: { gte: start, lte: end },
          obligation: { businessId: user.main_business_id },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return reply.send({
      report: 'daily',
      station: { id: station.id, name: station.name },
      businessDate: query.businessDate,
      businessDateLabel: toYmdKarachi(day.businessDate),
      status: day.status,
      sales: {
        cashLitres: cashBundle.cashLitres,
        cashAmount: cashBundle.cashAmount,
        creditLitres: cashBundle.creditLitres,
        creditAmount: cashBundle.creditAmount,
        creditCount: cashBundle.creditCount,
        byProduct: cashBundle.result.productSales,
      },
      cash: {
        bbfCash: cashBundle.result.bbfCash,
        saleTotal: cashBundle.result.saleTotal,
        total: cashBundle.result.total,
        creditSalesTotal: cashBundle.result.creditSalesTotal,
        cashPaidOutTotal: cashBundle.result.cashPaidOutTotal,
        expectedCashInHand: cashBundle.result.expectedCashInHand,
        actualCashCounted: cashBundle.result.actualCashCounted,
        onlinePaymentsTotal: cashBundle.result.onlinePaymentsTotal,
        difference: cashBundle.result.difference,
        hasDifference: cashBundle.result.hasDifference,
      },
      stock: { tanks: stock },
      expenses: {
        rows: expenseRows.map((row) => ({
          id: row.id,
          category: row.expenseCategory?.name ?? row.category,
          amount: num(row.amount),
          paidFromTodaysCash: row.paidFromTodaysCash,
          description: row.description,
        })),
        cashPaidOutTotal: cashBundle.result.cashPaidOutTotal,
        total: round2(expenseRows.reduce((sum, row) => sum + num(row.amount), 0)),
      },
      advances: {
        total: num(advanceAgg._sum.amount),
        count: advanceAgg._count,
      },
      pnl: {
        revenue: pnl.revenue,
        cashSalesRevenue: pnl.cashSalesRevenue,
        creditSalesRevenue: pnl.creditSalesRevenue,
        fuelCost: pnl.fuelCost,
        otherExpenses: pnl.otherExpenses,
        tankerTipShownSeparate: pnl.tankerTipShownSeparate,
        accessGain: pnl.accessGain,
        netProfitLoss: pnl.netProfitLoss,
      },
    });
  });

  app.get('/api/v1/fuel/reports/monthly', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z.object({ stationId: id, yearMonth }).parse(request.query);
    const station = await assertStation(prisma, user.main_business_id, query.stationId);
    if (!station) return sendApiError(reply, 404, 'Station not found.', { code: 'NOT_FOUND' });

    const { from, to } = monthBounds(query.yearMonth);
    const dates = eachYmd(from, to);
    const days = [];
    const totals = {
      cashSales: 0,
      creditSales: 0,
      cashPaidOut: 0,
      netProfitLoss: 0,
      daysWithDifference: 0,
    };

    for (const businessDate of dates) {
      const day = await prisma.businessDay.findUnique({
        where: {
          stationId_businessDate: {
            stationId: station.id,
            businessDate: new Date(`${businessDate}T00:00:00.000Z`),
          },
        },
      });
      if (!day) continue;

      const [cashBundle, pnl] = await Promise.all([
        loadDayCashInputs(prisma, station.id, businessDate, day.id, num(day.bbfCash)),
        loadDayPnl(prisma, user.main_business_id, station.id, businessDate, day.id),
      ]);

      totals.cashSales = round2(totals.cashSales + cashBundle.cashAmount);
      totals.creditSales = round2(totals.creditSales + cashBundle.creditAmount);
      totals.cashPaidOut = round2(totals.cashPaidOut + cashBundle.result.cashPaidOutTotal);
      totals.netProfitLoss = round2(totals.netProfitLoss + pnl.netProfitLoss);
      if (cashBundle.result.hasDifference) totals.daysWithDifference += 1;

      days.push({
        businessDate,
        status: day.status,
        cashSales: cashBundle.cashAmount,
        creditSales: cashBundle.creditAmount,
        cashPaidOut: cashBundle.result.cashPaidOutTotal,
        cashDifference: cashBundle.result.difference,
        netProfitLoss: pnl.netProfitLoss,
      });
    }

    return reply.send({
      report: 'monthly',
      station: { id: station.id, name: station.name },
      yearMonth: query.yearMonth,
      from,
      to,
      days,
      totals,
    });
  });

  app.get('/api/v1/fuel/reports/company-statement', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z.object({ organizationId: id, from: ymd, to: ymd }).parse(request.query);

    const organization = await prisma.organization.findFirst({
      where: { id: query.organizationId, businessId: user.main_business_id },
      include: {
        sales: {
          where: { saleType: 'CREDIT', status: 'CONFIRMED' },
          include: { vehicle: true, lines: { include: { fuelType: true } } },
          orderBy: { soldAt: 'asc' },
        },
        payments: { orderBy: { paidAt: 'asc' } },
      },
    });
    if (!organization) {
      return sendApiError(reply, 404, 'Company not found.', { code: 'NOT_FOUND' });
    }

    const fromStart = karachiDayBounds(query.from).start;
    const toEnd = karachiDayBounds(query.to).end;
    const openingBalance = num(organization.openingBalance);

    type Draft = {
      date: Date;
      type: 'OPENING' | 'CREDIT' | 'PAYMENT';
      debit: number;
      credit: number;
      reference: string;
      description: string;
      saleId?: string;
    };

    const all: Draft[] = [
      {
        date: organization.createdAt,
        type: 'OPENING' as const,
        debit: openingBalance > 0 ? openingBalance : 0,
        credit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
        reference: 'OPENING',
        description: 'Opening balance',
      },
      ...organization.sales.map((sale): Draft => ({
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
      ...organization.payments.map((payment): Draft => ({
        date: payment.paidAt,
        type: 'PAYMENT',
        debit: 0,
        credit: num(payment.amount),
        reference: payment.reference ?? payment.id,
        description: `${payment.method} payment`,
      })),
    ];
    all.sort((a, b) => a.date.getTime() - b.date.getTime());

    let running = 0;
    let openingInRange = 0;
    const entries = [];
    let debitTotal = 0;
    let creditTotal = 0;

    for (const entry of all) {
      running = round2(running + entry.debit - entry.credit);
      if (entry.date < fromStart) {
        openingInRange = running;
        continue;
      }
      if (entry.date > toEnd) continue;
      debitTotal = round2(debitTotal + entry.debit);
      creditTotal = round2(creditTotal + entry.credit);
      entries.push({
        date: entry.date.toISOString(),
        type: entry.type,
        debit: entry.debit,
        credit: entry.credit,
        reference: entry.reference,
        description: entry.description,
        saleId: entry.saleId,
        balance: running,
      });
    }

    return reply.send({
      report: 'company-statement',
      organization: {
        id: organization.id,
        name: organization.name,
        phone: organization.phone,
        creditType: organization.creditType,
        creditLimit: num(organization.creditLimit),
      },
      from: query.from,
      to: query.to,
      openingBalance: openingInRange,
      entries,
      totals: { debit: debitTotal, credit: creditTotal },
      closingBalance: round2(openingInRange + debitTotal - creditTotal),
    });
  });

  app.get('/api/v1/fuel/reports/vehicle-consumption', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z
      .object({
        from: ymd,
        to: ymd,
        organizationId: id.optional(),
        vehicleId: id.optional(),
      })
      .parse(request.query);

    const { start } = karachiDayBounds(query.from);
    const { end } = karachiDayBounds(query.to);

    const sales = await prisma.sale.findMany({
      where: {
        status: 'CONFIRMED',
        saleType: 'CREDIT',
        soldAt: { gte: start, lte: end },
        station: { businessId: user.main_business_id },
        ...(query.organizationId ? { organizationId: query.organizationId } : {}),
        ...(query.vehicleId ? { vehicleId: query.vehicleId } : {}),
      },
      include: {
        vehicle: { select: { id: true, registration: true } },
        organization: { select: { id: true, name: true } },
        lines: { include: { fuelType: { select: { code: true, name: true } } } },
      },
      orderBy: { soldAt: 'asc' },
    });

    const byVehicle = new Map<
      string,
      {
        vehicleId: string;
        registration: string;
        organizationId: string;
        organizationName: string;
        litres: number;
        amount: number;
        tripCount: number;
        byProduct: Map<string, { code: string; name: string; litres: number; amount: number }>;
      }
    >();

    for (const sale of sales) {
      const vehicleId = sale.vehicleId ?? 'unknown';
      const current = byVehicle.get(vehicleId) ?? {
        vehicleId,
        registration: sale.vehicle?.registration ?? 'Unknown',
        organizationId: sale.organization?.id ?? '',
        organizationName: sale.organization?.name ?? '',
        litres: 0,
        amount: 0,
        tripCount: 0,
        byProduct: new Map(),
      };
      current.litres = round3(current.litres + num(sale.totalLitres));
      current.amount = round2(current.amount + num(sale.totalAmount));
      current.tripCount += 1;
      for (const line of sale.lines) {
        const code = line.fuelType.code;
        const product = current.byProduct.get(code) ?? {
          code,
          name: line.fuelType.name,
          litres: 0,
          amount: 0,
        };
        product.litres = round3(product.litres + num(line.litres));
        product.amount = round2(product.amount + num(line.amount));
        current.byProduct.set(code, product);
      }
      byVehicle.set(vehicleId, current);
    }

    const vehicles = [...byVehicle.values()]
      .map((row) => ({
        vehicleId: row.vehicleId,
        registration: row.registration,
        organizationId: row.organizationId,
        organizationName: row.organizationName,
        litres: row.litres,
        amount: row.amount,
        tripCount: row.tripCount,
        byProduct: [...row.byProduct.values()],
      }))
      .sort((a, b) => a.registration.localeCompare(b.registration));

    return reply.send({
      report: 'vehicle-consumption',
      from: query.from,
      to: query.to,
      vehicles,
      totals: {
        litres: round3(vehicles.reduce((sum, row) => sum + row.litres, 0)),
        amount: round2(vehicles.reduce((sum, row) => sum + row.amount, 0)),
        trips: vehicles.reduce((sum, row) => sum + row.tripCount, 0),
      },
    });
  });

  app.get('/api/v1/fuel/reports/stock', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z.object({ stationId: id, from: ymd, to: ymd }).parse(request.query);
    const station = await assertStation(prisma, user.main_business_id, query.stationId);
    if (!station) return sendApiError(reply, 404, 'Station not found.', { code: 'NOT_FOUND' });

    const days = [];
    for (const businessDate of eachYmd(query.from, query.to)) {
      const day = await prisma.businessDay.findUnique({
        where: {
          stationId_businessDate: {
            stationId: station.id,
            businessDate: new Date(`${businessDate}T00:00:00.000Z`),
          },
        },
      });
      if (!day) continue;
      const tanks = await loadDayStock(prisma, station.id, businessDate, day.id);
      days.push({
        businessDate,
        status: day.status,
        tanks,
        saleOfDay: round3(tanks.reduce((sum, tank) => sum + tank.saleOfDay, 0)),
        received: round3(tanks.reduce((sum, tank) => sum + tank.received, 0)),
      });
    }

    return reply.send({
      report: 'stock',
      station: { id: station.id, name: station.name },
      from: query.from,
      to: query.to,
      days,
      totals: {
        saleOfDay: round3(days.reduce((sum, day) => sum + day.saleOfDay, 0)),
        received: round3(days.reduce((sum, day) => sum + day.received, 0)),
      },
    });
  });

  app.get('/api/v1/fuel/reports/cash', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z.object({ stationId: id, from: ymd, to: ymd }).parse(request.query);
    const station = await assertStation(prisma, user.main_business_id, query.stationId);
    if (!station) return sendApiError(reply, 404, 'Station not found.', { code: 'NOT_FOUND' });

    const days = [];
    const totals = {
      saleTotal: 0,
      cashPaidOut: 0,
      expectedCashInHand: 0,
      actualCashCounted: 0,
      difference: 0,
    };

    for (const businessDate of eachYmd(query.from, query.to)) {
      const day = await prisma.businessDay.findUnique({
        where: {
          stationId_businessDate: {
            stationId: station.id,
            businessDate: new Date(`${businessDate}T00:00:00.000Z`),
          },
        },
      });
      if (!day) continue;
      const cashBundle = await loadDayCashInputs(
        prisma,
        station.id,
        businessDate,
        day.id,
        num(day.bbfCash)
      );
      const r = cashBundle.result;
      totals.saleTotal = round2(totals.saleTotal + r.saleTotal);
      totals.cashPaidOut = round2(totals.cashPaidOut + r.cashPaidOutTotal);
      totals.expectedCashInHand = round2(totals.expectedCashInHand + r.expectedCashInHand);
      totals.actualCashCounted = round2(totals.actualCashCounted + r.actualCashCounted);
      totals.difference = round2(totals.difference + r.difference);
      days.push({
        businessDate,
        status: day.status,
        saleTotal: r.saleTotal,
        bbfCash: r.bbfCash,
        creditSalesTotal: r.creditSalesTotal,
        cashPaidOutTotal: r.cashPaidOutTotal,
        expectedCashInHand: r.expectedCashInHand,
        actualCashCounted: r.actualCashCounted,
        onlinePaymentsTotal: r.onlinePaymentsTotal,
        difference: r.difference,
        hasDifference: r.hasDifference,
      });
    }

    return reply.send({
      report: 'cash',
      station: { id: station.id, name: station.name },
      from: query.from,
      to: query.to,
      days,
      totals,
    });
  });

  app.get('/api/v1/fuel/reports/pnl', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z.object({ stationId: id, from: ymd, to: ymd }).parse(request.query);
    const station = await assertStation(prisma, user.main_business_id, query.stationId);
    if (!station) return sendApiError(reply, 404, 'Station not found.', { code: 'NOT_FOUND' });

    const days = [];
    const totals = {
      revenue: 0,
      fuelCost: 0,
      otherExpenses: 0,
      accessGain: 0,
      netProfitLoss: 0,
    };

    for (const businessDate of eachYmd(query.from, query.to)) {
      const day = await prisma.businessDay.findUnique({
        where: {
          stationId_businessDate: {
            stationId: station.id,
            businessDate: new Date(`${businessDate}T00:00:00.000Z`),
          },
        },
      });
      if (!day) continue;
      const pnl = await loadDayPnl(prisma, user.main_business_id, station.id, businessDate, day.id);
      totals.revenue = round2(totals.revenue + pnl.revenue);
      totals.fuelCost = round2(totals.fuelCost + pnl.fuelCost);
      totals.otherExpenses = round2(totals.otherExpenses + pnl.otherExpenses);
      totals.accessGain = round2(totals.accessGain + pnl.accessGain);
      totals.netProfitLoss = round2(totals.netProfitLoss + pnl.netProfitLoss);
      days.push({
        businessDate,
        status: day.status,
        revenue: pnl.revenue,
        cashSalesRevenue: pnl.cashSalesRevenue,
        creditSalesRevenue: pnl.creditSalesRevenue,
        fuelCost: pnl.fuelCost,
        otherExpenses: pnl.otherExpenses,
        tankerTipShownSeparate: pnl.tankerTipShownSeparate,
        accessGain: pnl.accessGain,
        netProfitLoss: pnl.netProfitLoss,
      });
    }

    return reply.send({
      report: 'pnl',
      station: { id: station.id, name: station.name },
      from: query.from,
      to: query.to,
      days,
      totals,
    });
  });
};
