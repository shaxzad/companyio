import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { User as AuthUser } from '@companyio/auth-contracts';
import { sendApiError } from './http-errors.ts';
import {
  ACCESS_VALUATIONS,
  computeDailyPnl,
  COSTING_METHODS,
  DEFAULT_PNL_SETTINGS,
  parsePnlSettings,
  REOPEN_POLICIES,
  round2,
  TANKER_TIP_MODES,
} from './pnl.ts';
import { karachiDayBounds } from './stock-recon.ts';

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

export const registerPnlRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  authenticate: Authenticator
) => {
  app.get('/api/v1/fuel/pnl-settings', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;

    const business = await prisma.business.findUnique({
      where: { id: user.main_business_id },
      select: { settings: true },
    });
    const settings = parsePnlSettings(business?.settings);

    return reply.send({
      settings,
      defaults: DEFAULT_PNL_SETTINGS,
      options: {
        costingMethod: [...COSTING_METHODS],
        accessValuation: [...ACCESS_VALUATIONS],
        tankerTipInPnl: [...TANKER_TIP_MODES],
        reopenPolicy: [...REOPEN_POLICIES],
      },
      section5Note:
        'These are placeholders until the owner confirms Section 5 questions 1, 2, 9, and 12.',
    });
  });

  app.patch('/api/v1/fuel/pnl-settings', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    if (user.role !== 'owner') {
      return sendApiError(reply, 403, 'Only the owner can change P&L placeholders.', {
        code: 'FORBIDDEN',
      });
    }

    const input = z
      .object({
        costingMethod: z.enum(COSTING_METHODS).optional(),
        accessValuation: z.enum(ACCESS_VALUATIONS).optional(),
        tankerTipInPnl: z.enum(TANKER_TIP_MODES).optional(),
        reopenPolicy: z.enum(REOPEN_POLICIES).optional(),
      })
      .parse(request.body);

    const business = await prisma.business.findUnique({
      where: { id: user.main_business_id },
      select: { settings: true },
    });
    const current = parsePnlSettings(business?.settings);
    const next = {
      ...current,
      ...input,
    };

    const existing =
      business?.settings &&
      typeof business.settings === 'object' &&
      !Array.isArray(business.settings)
        ? (business.settings as Record<string, unknown>)
        : {};

    await prisma.business.update({
      where: { id: user.main_business_id },
      data: {
        settings: {
          ...existing,
          ...next,
        },
      },
    });

    return reply.send({
      settings: next,
      section5Note:
        'Saved as configurable placeholders — not permanent until Section 5 is confirmed.',
    });
  });

  app.get('/api/v1/fuel/pnl', async (request, reply) => {
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
        message: 'Open this business day first (Daily opening) to see daily P&L.',
        settings: DEFAULT_PNL_SETTINGS,
        result: null,
      });
    }

    const { start, end } = karachiDayBounds(query.businessDate);

    const business = await prisma.business.findUnique({
      where: { id: user.main_business_id },
      select: { settings: true },
    });
    const settings = parsePnlSettings(business?.settings);

    const [cashSales, creditSales, onlinePayments, receipts, expenses, fuelTypes] =
      await Promise.all([
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
            lines: {
              include: { fuelType: { select: { id: true, code: true, purchasePrice: true } } },
            },
          },
        }),
        prisma.sale.findMany({
          where: {
            stationId: station.id,
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
            stationId: station.id,
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
            stationId: station.id,
            OR: [
              { businessDayId: day.id },
              { businessDayId: null, receivedAt: { gte: start, lte: end } },
            ],
          },
          select: {
            accessLitres: true,
            accessRate: true,
            tankerTip: true,
            fuelCost: true,
            purchaseRate: true,
          },
        }),
        prisma.expense.findMany({
          where: {
            stationId: station.id,
            spentAt: { gte: start, lte: end },
          },
          include: { expenseCategory: { select: { code: true } } },
        }),
        prisma.fuelType.findMany({
          where: { businessId: user.main_business_id },
          select: { id: true, purchasePrice: true, sellingPrice: true },
        }),
      ]);

    const purchaseByFuel = new Map(
      fuelTypes.map((row) => [
        row.id,
        { purchase: num(row.purchasePrice), selling: num(row.sellingPrice) },
      ])
    );

    let cashSalesRevenue = 0;
    let creditSalesRevenue = 0;
    let fuelCost = 0;
    let litresSold = 0;

    const applySaleLines = (sales: typeof cashSales, onRevenue: (amount: number) => void) => {
      for (const sale of sales) {
        onRevenue(num(sale.totalAmount));
        for (const line of sale.lines) {
          const litres = num(line.litres);
          litresSold += litres;
          const catalog = purchaseByFuel.get(line.fuelTypeId);
          const unitCost = num(line.fuelType.purchasePrice ?? catalog?.purchase ?? 0);
          fuelCost = round2(fuelCost + litres * unitCost);
        }
      }
    };

    applySaleLines(cashSales, (amount) => {
      cashSalesRevenue = round2(cashSalesRevenue + amount);
    });
    applySaleLines(creditSales, (amount) => {
      creditSalesRevenue = round2(creditSalesRevenue + amount);
    });

    // Access gain from receipts (rate already chosen at receiving time).
    let accessGain = 0;
    let tankerTipTotal = 0;
    for (const receipt of receipts) {
      accessGain = round2(accessGain + num(receipt.accessLitres) * num(receipt.accessRate));
      tankerTipTotal = round2(tankerTipTotal + num(receipt.tankerTip));
    }

    let otherExpenses = 0;
    for (const expense of expenses) {
      otherExpenses = round2(otherExpenses + num(expense.amount));
    }

    const onlinePaymentsTotal = round2(
      onlinePayments.reduce((sum, payment) => sum + num(payment.amount), 0)
    );

    const revenueBeforeTip = round2(cashSalesRevenue + creditSalesRevenue);
    const priceGainLoss = round2(revenueBeforeTip - fuelCost);

    const result = computeDailyPnl({
      cashSalesRevenue,
      creditSalesRevenue,
      onlinePaymentsTotal,
      fuelCost,
      tankerTipTotal,
      otherExpenses,
      accessGain,
      priceGainLoss,
      settings,
    });

    return reply.send({
      stationId: station.id,
      businessDate: query.businessDate,
      businessDayId: day.id,
      status: day.status,
      settings,
      sections: {
        revenue: result.revenue,
        cashSalesRevenue: result.cashSalesRevenue,
        creditSalesRevenue: result.creditSalesRevenue,
        onlinePaymentsTotal: result.onlinePaymentsTotal,
        fuelCost: result.fuelCost,
        tankerTipTotal: result.tankerTipTotal,
        tankerTipShownSeparate: result.tankerTipShownSeparate,
        otherExpenses: result.otherExpenses,
        accessGain: result.accessGain,
        priceGainLoss: result.priceGainLoss,
        netProfitLoss: result.netProfitLoss,
      },
      meta: {
        litresSold: round2(litresSold),
        cashSaleCount: cashSales.length,
        creditSaleCount: creditSales.length,
        receiptCount: receipts.length,
        expenseCount: expenses.length,
        onlinePaymentCount: onlinePayments.length,
        notes: result.notes,
        formula:
          'Net = Revenue − Fuel Cost − Other Expenses − Tanker Tip (if separate) + Access / Gain (Price Gain shown separately; not double-counted)',
        cashVsAccounting:
          'Cash reconciliation (Feature 13) is separate from this accounting P&L view.',
      },
    });
  });
};
