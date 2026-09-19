import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { User as AuthUser } from '@companyio/auth-contracts';
import { sendApiError } from './http-errors.ts';
import { computeCashReconciliation, round2 as cashRound2 } from './cash-recon.ts';
import { canReopenDay, parsePnlSettings } from './pnl.ts';
import { karachiDayBounds, syncBusinessDayTankClosing } from './stock-recon.ts';

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

type ChecklistItem = {
  key: string;
  label: string;
  href: string;
  required: boolean;
  complete: boolean;
  detail: string;
};

const buildChecklist = async (
  prisma: PrismaClient,
  stationId: string,
  businessDateYmd: string,
  day: {
    id: string;
    status: string;
    bbfCash: unknown;
    meters: unknown[];
    tanks: Array<{ id: string; tankId: string; closingStock: unknown }>;
  }
): Promise<ChecklistItem[]> => {
  const { start, end } = karachiDayBounds(businessDateYmd);
  const businessDate = new Date(`${businessDateYmd}T00:00:00.000Z`);

  const [cashSale, creditCount, receiptCount, paymentCount, expenseCount, cashCount] =
    await Promise.all([
      prisma.sale.findFirst({
        where: {
          stationId,
          status: 'CONFIRMED',
          saleType: 'CASH',
          OR: [
            { businessDayId: day.id },
            { businessDayId: null, soldAt: { gte: start, lte: end } },
          ],
        },
        select: { id: true },
      }),
      prisma.sale.count({
        where: {
          stationId,
          status: 'CONFIRMED',
          saleType: 'CREDIT',
          soldAt: { gte: start, lte: end },
        },
      }),
      prisma.fuelReceipt.count({
        where: {
          stationId,
          OR: [
            { businessDayId: day.id },
            { businessDayId: null, receivedAt: { gte: start, lte: end } },
          ],
        },
      }),
      prisma.payment.count({
        where: {
          stationId,
          paidAt: { gte: start, lte: end },
          OR: [
            { paymentAccount: { kind: { in: [...ONLINE_KINDS] } } },
            { paymentAccountId: null, method: { in: [...ONLINE_KINDS] } },
          ],
        },
      }),
      prisma.expense.count({
        where: { stationId, spentAt: { gte: start, lte: end } },
      }),
      prisma.cashCount.findUnique({
        where: { stationId_businessDate: { stationId, businessDate } },
        select: { id: true, totalCash: true },
      }),
    ]);

  // Ensure closing stock is current for checklist
  for (const tank of day.tanks) {
    await syncBusinessDayTankClosing(prisma, day.id, tank.tankId);
  }
  const tanksFresh = await prisma.businessDayTank.findMany({
    where: { businessDayId: day.id },
    select: { closingStock: true },
  });
  const stockComplete =
    tanksFresh.length > 0 && tanksFresh.every((row) => row.closingStock !== null);

  return [
    {
      key: 'opening',
      label: 'Opening readings',
      href: '/opening',
      required: true,
      complete: day.meters.length > 0 && day.tanks.length > 0,
      detail: `${day.meters.length} meters · ${day.tanks.length} tanks · BBF ${num(day.bbfCash).toLocaleString()}`,
    },
    {
      key: 'fuelSales',
      label: 'Fuel sales (metre)',
      href: '/sales',
      required: true,
      complete: Boolean(cashSale),
      detail: cashSale ? 'Metre / cash sales posted' : 'Post metre sales before closing',
    },
    {
      key: 'tankerReceipts',
      label: 'Tanker receipts',
      href: '/fuel-purchases',
      required: false,
      complete: true,
      detail: receiptCount === 0 ? 'None today (OK)' : `${receiptCount} receipt(s)`,
    },
    {
      key: 'creditSales',
      label: 'Credit transactions',
      href: '/fleet-sales',
      required: false,
      complete: true,
      detail: creditCount === 0 ? 'None today (OK)' : `${creditCount} credit sale(s)`,
    },
    {
      key: 'onlinePayments',
      label: 'Online payments',
      href: '/payments',
      required: false,
      complete: true,
      detail: paymentCount === 0 ? 'None today (OK)' : `${paymentCount} payment(s)`,
    },
    {
      key: 'expenses',
      label: 'Expenses / cash paid out',
      href: '/expenses',
      required: false,
      complete: true,
      detail: expenseCount === 0 ? 'None today (OK)' : `${expenseCount} expense(s)`,
    },
    {
      key: 'cashCount',
      label: 'Cash denomination count',
      href: '/cash-count',
      required: true,
      complete: Boolean(cashCount),
      detail: cashCount
        ? `Counted · PKR ${num(cashCount.totalCash).toLocaleString()}`
        : 'Save a cash count for this date',
    },
    {
      key: 'stockRecon',
      label: 'Stock reconciliation',
      href: '/inventory',
      required: true,
      complete: stockComplete,
      detail: stockComplete
        ? `Closing stock set for ${tanksFresh.length} tank(s)`
        : 'Open stock recon to refresh closing stock',
    },
    {
      key: 'cashRecon',
      label: 'Cash reconciliation',
      href: '/cash-recon',
      required: true,
      complete: Boolean(cashCount),
      detail: cashCount
        ? 'Review expected vs actual on Cash recon'
        : 'Needs cash count before cash recon is complete',
    },
    {
      key: 'pnl',
      label: 'Daily P&L',
      href: '/pnl',
      required: true,
      complete: Boolean(cashSale),
      detail: cashSale ? 'P&L available for this day' : 'Needs fuel sales for a meaningful P&L',
    },
  ];
};

export const registerClosingRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  authenticate: Authenticator
) => {
  app.get('/api/v1/fuel/closing', async (request, reply) => {
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
      where: { stationId_businessDate: { stationId: station.id, businessDate } },
      include: { meters: true, tanks: true },
    });

    const business = await prisma.business.findUnique({
      where: { id: user.main_business_id },
      select: { settings: true },
    });
    const settings = parsePnlSettings(business?.settings);

    if (!day) {
      return reply.send({
        stationId: station.id,
        businessDate: query.businessDate,
        businessDayId: null,
        status: null,
        workflowLabel: 'Not opened',
        checklist: [],
        requiredComplete: false,
        canMarkReconciled: false,
        canClose: false,
        canReopen: false,
        reopenPolicy: settings.reopenPolicy,
        message: 'Open this business day first (Daily opening).',
      });
    }

    const checklist = await buildChecklist(prisma, station.id, query.businessDate, day);
    const requiredComplete = checklist
      .filter((item) => item.required)
      .every((item) => item.complete);
    const status = day.status;

    const canMarkReconciled =
      status === 'OPEN' && requiredComplete && ['owner', 'manager', 'staff'].includes(user.role);
    const canClose = status === 'RECONCILED' && ['owner', 'manager'].includes(user.role);
    const canReopen = status === 'CLOSED' && canReopenDay(user.role, settings.reopenPolicy);

    const workflowLabel =
      status === 'OPEN' ? 'Draft' : status === 'RECONCILED' ? 'Reconciled' : 'Closed';

    return reply.send({
      stationId: station.id,
      businessDate: query.businessDate,
      businessDayId: day.id,
      status,
      workflowLabel,
      checklist,
      requiredComplete,
      incompleteRequired: checklist
        .filter((item) => item.required && !item.complete)
        .map((i) => i.key),
      canMarkReconciled,
      canClose,
      canReopen,
      reopenPolicy: settings.reopenPolicy,
      reconciledAt: day.reconciledAt?.toISOString() ?? null,
      reconciledBy: day.reconciledBy,
      closedAt: day.closedAt?.toISOString() ?? null,
      closedBy: day.closedBy,
    });
  });

  /** Draft → Reconciled (checklist must be complete). */
  app.post('/api/v1/fuel/closing/reconcile', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    if (!['owner', 'manager', 'staff'].includes(user.role)) {
      return sendApiError(reply, 403, 'Your role cannot mark a day reconciled.', {
        code: 'FORBIDDEN',
      });
    }

    const input = z
      .object({
        stationId: id,
        businessDate: ymd,
      })
      .parse(request.body);

    const station = await prisma.station.findFirst({
      where: { id: input.stationId, businessId: user.main_business_id },
    });
    if (!station) return sendApiError(reply, 404, 'Station not found.', { code: 'NOT_FOUND' });

    const businessDate = new Date(`${input.businessDate}T00:00:00.000Z`);
    const day = await prisma.businessDay.findUnique({
      where: { stationId_businessDate: { stationId: station.id, businessDate } },
      include: { meters: true, tanks: true },
    });
    if (!day) return sendApiError(reply, 404, 'Business day not found.', { code: 'NOT_FOUND' });
    if (day.status !== 'OPEN') {
      return sendApiError(reply, 409, 'Only a Draft (open) day can be marked Reconciled.', {
        code: 'INVALID_STATUS',
      });
    }

    const checklist = await buildChecklist(prisma, station.id, input.businessDate, day);
    const incomplete = checklist.filter((item) => item.required && !item.complete);
    if (incomplete.length) {
      return sendApiError(
        reply,
        400,
        `Complete required checklist items first: ${incomplete.map((i) => i.label).join(', ')}.`,
        { code: 'CHECKLIST_INCOMPLETE' }
      );
    }

    const updated = await prisma.businessDay.update({
      where: { id: day.id },
      data: {
        status: 'RECONCILED',
        reconciledAt: new Date(),
        reconciledBy: user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        businessId: user.main_business_id,
        userId: user.id,
        action: 'RECONCILE',
        entityType: 'BUSINESS_DAY',
        entityId: day.id,
        details: { businessDate: input.businessDate, stationId: station.id },
      },
    });

    return reply.send({
      businessDayId: updated.id,
      status: updated.status,
      reconciledAt: updated.reconciledAt?.toISOString() ?? null,
    });
  });

  /** Reconciled → Closed (owner / manager). */
  app.post('/api/v1/fuel/closing/close', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    if (!['owner', 'manager'].includes(user.role)) {
      return sendApiError(reply, 403, 'Only owner or manager can close a day.', {
        code: 'FORBIDDEN',
      });
    }

    const input = z
      .object({
        stationId: id,
        businessDate: ymd,
        notes: z.string().max(500).optional(),
      })
      .parse(request.body);

    const station = await prisma.station.findFirst({
      where: { id: input.stationId, businessId: user.main_business_id },
    });
    if (!station) return sendApiError(reply, 404, 'Station not found.', { code: 'NOT_FOUND' });

    const businessDate = new Date(`${input.businessDate}T00:00:00.000Z`);
    const day = await prisma.businessDay.findUnique({
      where: { stationId_businessDate: { stationId: station.id, businessDate } },
      include: { meters: true, tanks: true },
    });
    if (!day) return sendApiError(reply, 404, 'Business day not found.', { code: 'NOT_FOUND' });
    if (day.status !== 'RECONCILED') {
      return sendApiError(reply, 409, 'Mark the day Reconciled before closing.', {
        code: 'INVALID_STATUS',
      });
    }

    const checklist = await buildChecklist(prisma, station.id, input.businessDate, day);
    const incomplete = checklist.filter((item) => item.required && !item.complete);
    if (incomplete.length) {
      return sendApiError(reply, 400, 'Required checklist items are no longer complete.', {
        code: 'CHECKLIST_INCOMPLETE',
      });
    }

    const { start, end } = karachiDayBounds(input.businessDate);
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
        include: { lines: { include: { fuelType: { select: { code: true, name: true } } } } },
      }),
      prisma.sale.aggregate({
        where: {
          stationId: station.id,
          status: 'CONFIRMED',
          saleType: 'CREDIT',
          soldAt: { gte: start, lte: end },
        },
        _sum: { totalAmount: true },
      }),
      prisma.expense.aggregate({
        where: {
          stationId: station.id,
          spentAt: { gte: start, lte: end },
          paidFromTodaysCash: true,
        },
        _sum: { amount: true },
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
        where: { stationId_businessDate: { stationId: station.id, businessDate } },
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
        current.amount = cashRound2(current.amount + num(line.amount));
        byProduct.set(code, current);
      }
    }

    const cashResult = computeCashReconciliation({
      productSales: [...byProduct.values()],
      bbfCash: num(day.bbfCash),
      creditSalesTotal: num(creditAgg._sum.totalAmount),
      cashPaidOutTotal: num(cashPaidOutAgg._sum.amount),
      actualCashCounted: cashCount ? num(cashCount.totalCash) : 0,
      onlinePaymentsTotal: cashRound2(
        onlinePayments.reduce((sum, payment) => sum + num(payment.amount), 0)
      ),
    });

    const closed = await prisma.$transaction(async (tx) => {
      const updated = await tx.businessDay.update({
        where: { id: day.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          closedBy: user.id,
        },
      });

      await tx.dailyClosing.upsert({
        where: {
          stationId_businessDate: { stationId: station.id, businessDate },
        },
        create: {
          id: randomUUID(),
          stationId: station.id,
          businessDate,
          openingCash: num(day.bbfCash),
          actualCash: cashResult.actualCashCounted,
          expectedCash: cashResult.expectedCashInHand,
          cashDifference: cashResult.difference,
          notes: input.notes ?? null,
          closedBy: user.id,
        },
        update: {
          openingCash: num(day.bbfCash),
          actualCash: cashResult.actualCashCounted,
          expectedCash: cashResult.expectedCashInHand,
          cashDifference: cashResult.difference,
          notes: input.notes ?? null,
          closedBy: user.id,
          closedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          businessId: user.main_business_id,
          userId: user.id,
          action: 'CLOSE',
          entityType: 'BUSINESS_DAY',
          entityId: day.id,
          details: {
            businessDate: input.businessDate,
            expectedCash: cashResult.expectedCashInHand,
            actualCash: cashResult.actualCashCounted,
            difference: cashResult.difference,
            notes: input.notes ?? null,
          },
        },
      });

      return updated;
    });

    return reply.send({
      businessDayId: closed.id,
      status: closed.status,
      closedAt: closed.closedAt?.toISOString() ?? null,
      cash: {
        expectedCashInHand: cashResult.expectedCashInHand,
        actualCashCounted: cashResult.actualCashCounted,
        difference: cashResult.difference,
      },
    });
  });

  /** Closed → Open (reopen) with required reason. */
  app.post('/api/v1/fuel/closing/reopen', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;

    const input = z
      .object({
        stationId: id,
        businessDate: ymd,
        reason: z.string().min(8).max(500),
      })
      .parse(request.body);

    const station = await prisma.station.findFirst({
      where: { id: input.stationId, businessId: user.main_business_id },
    });
    if (!station) return sendApiError(reply, 404, 'Station not found.', { code: 'NOT_FOUND' });

    const business = await prisma.business.findUnique({
      where: { id: user.main_business_id },
      select: { settings: true },
    });
    const settings = parsePnlSettings(business?.settings);
    if (!canReopenDay(user.role, settings.reopenPolicy)) {
      return sendApiError(
        reply,
        403,
        settings.reopenPolicy === 'OWNER_ONLY'
          ? 'Only the owner can reopen a closed day (Section 5 placeholder).'
          : 'Only owner or manager can reopen a closed day.',
        { code: 'FORBIDDEN' }
      );
    }

    const businessDate = new Date(`${input.businessDate}T00:00:00.000Z`);
    const day = await prisma.businessDay.findUnique({
      where: { stationId_businessDate: { stationId: station.id, businessDate } },
    });
    if (!day) return sendApiError(reply, 404, 'Business day not found.', { code: 'NOT_FOUND' });
    if (day.status !== 'CLOSED') {
      return sendApiError(reply, 409, 'Only a Closed day can be reopened.', {
        code: 'INVALID_STATUS',
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.businessDay.update({
        where: { id: day.id },
        data: {
          status: 'OPEN',
          closedAt: null,
          closedBy: null,
          reconciledAt: null,
          reconciledBy: null,
          overrideReason: input.reason,
        },
      });

      await tx.auditLog.create({
        data: {
          id: randomUUID(),
          businessId: user.main_business_id,
          userId: user.id,
          action: 'REOPEN',
          entityType: 'BUSINESS_DAY',
          entityId: day.id,
          details: {
            businessDate: input.businessDate,
            reason: input.reason,
            previousStatus: 'CLOSED',
          },
        },
      });

      return next;
    });

    return reply.send({
      businessDayId: updated.id,
      status: updated.status,
      reason: input.reason,
    });
  });
};
