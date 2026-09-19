import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { User as AuthUser } from '@companyio/auth-contracts';
import { sendApiError } from './http-errors.ts';
import { assertDayChangeAllowed, writeAuditLog } from './audit.ts';
import { toYmdKarachi } from './stock-recon.ts';

type Authenticator = (authorization?: string) => Promise<AuthUser | null>;

const id = z.string().min(1);
const positive = z.number().positive();
const date = z.coerce.date();

const ONLINE_KINDS = ['BANK', 'CARD', 'TRANSFER'] as const;

/** Placeholder defaults until Section 5 confirms the real account list. */
const DEFAULT_ACCOUNTS: Array<{
  name: string;
  code: string;
  kind: (typeof ONLINE_KINDS)[number];
  sortOrder: number;
}> = [
  { name: 'Bank transfer', code: 'BANK', kind: 'BANK', sortOrder: 10 },
  { name: 'Card / POS', code: 'CARD', kind: 'CARD', sortOrder: 20 },
  { name: 'Online transfer', code: 'TRANSFER', kind: 'TRANSFER', sortOrder: 30 },
];

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

const requireOwner = async (
  request: FastifyRequest,
  reply: FastifyReply,
  authenticate: Authenticator
) => {
  const user = await requireUser(request, reply, authenticate);
  if (!user) return null;
  if (user.role !== 'owner') {
    sendApiError(reply, 403, 'Only the owner can manage payment accounts.', {
      code: 'FORBIDDEN',
    });
    return null;
  }
  return user;
};

const startOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (value: Date) => {
  const next = new Date(value);
  next.setHours(23, 59, 59, 999);
  return next;
};

/** Business-day bounds in Asia/Karachi (UTC+5, no DST). */
const karachiDayBounds = (ymd: string) => ({
  start: new Date(`${ymd}T00:00:00.000+05:00`),
  end: new Date(`${ymd}T23:59:59.999+05:00`),
});

const serializePayment = (payment: {
  id: string;
  stationId: string;
  organizationId: string | null;
  paymentAccountId: string | null;
  saleId: string | null;
  amount: unknown;
  quantity: unknown;
  method: string;
  reference: string | null;
  paidAt: Date;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  organization?: { id: string; name: string } | null;
  paymentAccount?: { id: string; name: string; code: string; kind: string } | null;
  sale?: { id: string; invoiceNumber: string | null; saleNumber: string } | null;
}) => ({
  id: payment.id,
  stationId: payment.stationId,
  organizationId: payment.organizationId,
  paymentAccountId: payment.paymentAccountId,
  saleId: payment.saleId,
  amount: num(payment.amount),
  quantity: num(payment.quantity),
  method: payment.method,
  reference: payment.reference,
  paidAt: payment.paidAt.toISOString(),
  notes: payment.notes,
  createdBy: payment.createdBy,
  createdAt: payment.createdAt.toISOString(),
  organization: payment.organization ?? null,
  paymentAccount: payment.paymentAccount ?? null,
  sale: payment.sale
    ? {
        id: payment.sale.id,
        invoiceNumber: payment.sale.invoiceNumber,
        saleNumber: payment.sale.saleNumber,
      }
    : null,
});

export const registerPaymentRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  authenticate: Authenticator
) => {
  app.get('/api/v1/fuel/payment-accounts', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z
      .object({
        includeInactive: z
          .union([z.literal('true'), z.literal('false'), z.boolean()])
          .optional()
          .transform((value) => value === true || value === 'true'),
        onlineOnly: z
          .union([z.literal('true'), z.literal('false'), z.boolean()])
          .optional()
          .transform((value) => value === true || value === 'true'),
      })
      .parse(request.query);

    return reply.send(
      await prisma.paymentAccount.findMany({
        where: {
          businessId: user.main_business_id,
          ...(query.includeInactive ? {} : { active: true }),
          ...(query.onlineOnly ? { kind: { in: [...ONLINE_KINDS] } } : {}),
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      })
    );
  });

  app.post('/api/v1/fuel/payment-accounts', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;
    const input = z
      .object({
        name: z.string().trim().min(1).max(80),
        code: z
          .string()
          .trim()
          .min(1)
          .max(40)
          .transform((value) => value.toUpperCase()),
        kind: z.enum(['CASH', 'BANK', 'CARD', 'TRANSFER']),
        sortOrder: z.number().int().optional(),
      })
      .parse(request.body);

    try {
      return reply.code(201).send(
        await prisma.paymentAccount.create({
          data: {
            id: randomUUID(),
            businessId: user.main_business_id!,
            name: input.name,
            code: input.code,
            kind: input.kind,
            sortOrder: input.sortOrder ?? 100,
          },
        })
      );
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        return sendApiError(reply, 409, 'A payment account with this code already exists.', {
          fields: { code: 'Code already exists.' },
          code: 'DUPLICATE',
        });
      }
      throw error;
    }
  });

  app.post('/api/v1/fuel/payment-accounts/defaults', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;

    const existing = await prisma.paymentAccount.findMany({
      where: { businessId: user.main_business_id! },
      select: { code: true },
    });
    const codes = new Set(existing.map((row) => row.code));
    const created = [];
    for (const account of DEFAULT_ACCOUNTS) {
      if (codes.has(account.code)) continue;
      created.push(
        await prisma.paymentAccount.create({
          data: {
            id: randomUUID(),
            businessId: user.main_business_id!,
            name: account.name,
            code: account.code,
            kind: account.kind,
            sortOrder: account.sortOrder,
          },
        })
      );
    }
    return reply.send({ created: created.length, accounts: created });
  });

  app.patch('/api/v1/fuel/payment-accounts/:id', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;
    const params = z.object({ id }).parse(request.params);
    const input = z
      .object({
        name: z.string().trim().min(1).max(80).optional(),
        kind: z.enum(['CASH', 'BANK', 'CARD', 'TRANSFER']).optional(),
        sortOrder: z.number().int().optional(),
        active: z.boolean().optional(),
      })
      .parse(request.body);

    const existing = await prisma.paymentAccount.findFirst({
      where: { id: params.id, businessId: user.main_business_id! },
    });
    if (!existing)
      return sendApiError(reply, 404, 'Payment account not found.', { code: 'NOT_FOUND' });

    return reply.send(
      await prisma.paymentAccount.update({
        where: { id: existing.id },
        data: input,
      })
    );
  });

  app.get('/api/v1/fuel/payments', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z
      .object({
        stationId: id,
        businessDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        from: date.optional(),
        to: date.optional(),
        onlineOnly: z
          .union([z.literal('true'), z.literal('false'), z.boolean()])
          .optional()
          .transform((value) => value === true || value === 'true'),
      })
      .parse(request.query);

    const station = await prisma.station.findFirst({
      where: { id: query.stationId, businessId: user.main_business_id },
    });
    if (!station) return sendApiError(reply, 404, 'Station not found.', { code: 'NOT_FOUND' });

    const ymd =
      query.businessDate ??
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
    const { start: dayStart, end: dayEnd } =
      query.from && query.to
        ? { start: startOfDay(query.from), end: endOfDay(query.to) }
        : karachiDayBounds(ymd);
    const monthStartKarachi = new Date(`${ymd.slice(0, 7)}-01T00:00:00.000+05:00`);

    const onlineFilter = query.onlineOnly
      ? {
          OR: [
            { paymentAccount: { kind: { in: [...ONLINE_KINDS] } } },
            { paymentAccountId: null, method: { in: [...ONLINE_KINDS] } },
          ],
        }
      : {};

    const [dayPayments, monthAgg] = await Promise.all([
      prisma.payment.findMany({
        where: {
          stationId: station.id,
          paidAt: { gte: dayStart, lte: dayEnd },
          ...onlineFilter,
        },
        include: {
          organization: { select: { id: true, name: true } },
          paymentAccount: { select: { id: true, name: true, code: true, kind: true } },
          sale: { select: { id: true, invoiceNumber: true, saleNumber: true } },
        },
        orderBy: { paidAt: 'desc' },
      }),
      prisma.payment.aggregate({
        where: {
          stationId: station.id,
          paidAt: { gte: monthStartKarachi, lte: dayEnd },
          ...onlineFilter,
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const dailyTotal = dayPayments.reduce((sum, payment) => sum + num(payment.amount), 0);

    return reply.send({
      businessDate: ymd,
      dailyTotal: Math.round(dailyTotal * 100) / 100,
      monthlyTotal: Math.round(num(monthAgg._sum.amount) * 100) / 100,
      dailyCount: dayPayments.length,
      monthlyCount: monthAgg._count,
      payments: dayPayments.map(serializePayment),
    });
  });

  app.post('/api/v1/fuel/payments', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;

    const input = z
      .object({
        stationId: id,
        paymentAccountId: id,
        organizationId: id.optional(),
        saleId: id.optional(),
        amount: positive,
        quantity: z.number().positive().optional(),
        reference: z.string().trim().max(120).optional().or(z.literal('')),
        paidAt: date.optional(),
        notes: z.string().trim().max(500).optional().or(z.literal('')),
        auditReason: z.string().min(8).max(500).optional(),
      })
      .parse(request.body);

    const station = await prisma.station.findFirst({
      where: { id: input.stationId, businessId: user.main_business_id },
    });
    if (!station) {
      return sendApiError(reply, 400, 'Station not found.', {
        fields: { stationId: 'Station not found.' },
      });
    }

    const paidAt = input.paidAt ?? new Date();
    const lock = await assertDayChangeAllowed(prisma, reply, {
      stationId: station.id,
      businessDateYmd: toYmdKarachi(paidAt),
      auditReason: input.auditReason,
    });
    if (!lock.allowed) return;

    const account = await prisma.paymentAccount.findFirst({
      where: {
        id: input.paymentAccountId,
        businessId: user.main_business_id,
        active: true,
      },
    });
    if (!account) {
      return sendApiError(reply, 400, 'Payment account not found or inactive.', {
        fields: { paymentAccountId: 'Select a payment account.' },
      });
    }

    if (input.organizationId) {
      const organization = await prisma.organization.findFirst({
        where: { id: input.organizationId, businessId: user.main_business_id },
      });
      if (!organization) {
        return sendApiError(reply, 400, 'Company not found.', {
          fields: { organizationId: 'Company not found.' },
        });
      }
    }

    if (input.saleId) {
      const sale = await prisma.sale.findFirst({
        where: {
          id: input.saleId,
          station: { businessId: user.main_business_id },
        },
      });
      if (!sale) {
        return sendApiError(reply, 400, 'Invoice / sale not found.', {
          fields: { saleId: 'Invoice not found.' },
        });
      }
    }

    const created = await prisma.payment.create({
      data: {
        id: randomUUID(),
        stationId: input.stationId,
        paymentAccountId: account.id,
        organizationId: input.organizationId,
        saleId: input.saleId,
        amount: input.amount,
        quantity: input.quantity ?? 1,
        method: account.kind,
        reference: input.reference || null,
        paidAt,
        notes: input.notes || null,
        createdBy: user.id!,
      },
      include: {
        organization: { select: { id: true, name: true } },
        paymentAccount: { select: { id: true, name: true, code: true, kind: true } },
        sale: { select: { id: true, invoiceNumber: true, saleNumber: true } },
      },
    });

    if (lock.reason) {
      await writeAuditLog(prisma, {
        businessId: user.main_business_id,
        userId: user.id!,
        action: 'CREATE',
        entityType: 'PAYMENT',
        entityId: created.id,
        details: {
          reason: lock.reason,
          dayStatus: lock.dayStatus,
          after: { amount: input.amount, paidAt: paidAt.toISOString() },
        },
      });
    }

    return reply.code(201).send(serializePayment(created));
  });
};
