import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { User as AuthUser } from '@companyio/auth-contracts';
import { sendApiError } from './http-errors.ts';

type Authenticator = (authorization?: string) => Promise<AuthUser | null>;

const id = z.string().min(1);
const positive = z.number().positive();
const date = z.coerce.date();

/** Default categories from Feature 9 (owner can add more without a developer). */
const DEFAULT_CATEGORIES: Array<{ name: string; code: string; sortOrder: number }> = [
  { name: 'Kitchen', code: 'KITCHEN', sortOrder: 10 },
  { name: 'Rent', code: 'RENT', sortOrder: 20 },
  { name: 'Salary', code: 'SALARY', sortOrder: 30 },
  { name: 'Tanker Tip', code: 'TANKER_TIP', sortOrder: 40 },
  { name: 'Electricity', code: 'ELECTRICITY', sortOrder: 50 },
  { name: 'Maintenance', code: 'MAINTENANCE', sortOrder: 60 },
  { name: 'Transport', code: 'TRANSPORT', sortOrder: 70 },
  { name: 'Office', code: 'OFFICE', sortOrder: 80 },
  { name: 'Miscellaneous', code: 'MISC', sortOrder: 90 },
];

/** UI: Cash / Bank / Online → PaymentMethod enum. */
const EXPENSE_METHODS = ['CASH', 'BANK', 'TRANSFER'] as const;

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
    sendApiError(reply, 403, 'Only the owner can manage expense categories.', {
      code: 'FORBIDDEN',
    });
    return null;
  }
  return user;
};

/** Business-day bounds in Asia/Karachi (UTC+5, no DST). */
const karachiDayBounds = (ymd: string) => ({
  start: new Date(`${ymd}T00:00:00.000+05:00`),
  end: new Date(`${ymd}T23:59:59.999+05:00`),
});

const serializeExpense = (expense: {
  id: string;
  stationId: string;
  categoryId: string | null;
  category: string;
  name: string;
  description: string;
  amount: unknown;
  method: string;
  spentAt: Date;
  reference: string | null;
  attachmentUrl: string | null;
  paidFromTodaysCash: boolean;
  createdBy: string;
  createdAt: Date;
  expenseCategory?: { id: string; name: string; code: string } | null;
}) => ({
  id: expense.id,
  stationId: expense.stationId,
  categoryId: expense.categoryId,
  category: expense.category,
  name: expense.name,
  description: expense.description,
  amount: num(expense.amount),
  method: expense.method,
  spentAt: expense.spentAt.toISOString(),
  reference: expense.reference,
  attachmentUrl: expense.attachmentUrl,
  paidFromTodaysCash: expense.paidFromTodaysCash,
  createdBy: expense.createdBy,
  createdAt: expense.createdAt.toISOString(),
  expenseCategory: expense.expenseCategory ?? null,
});

export const registerExpenseRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  authenticate: Authenticator
) => {
  app.get('/api/v1/fuel/expense-categories', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z
      .object({
        includeInactive: z
          .union([z.literal('true'), z.literal('false'), z.boolean()])
          .optional()
          .transform((value) => value === true || value === 'true'),
      })
      .parse(request.query);

    return reply.send(
      await prisma.expenseCategory.findMany({
        where: {
          businessId: user.main_business_id,
          ...(query.includeInactive ? {} : { active: true }),
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      })
    );
  });

  app.post('/api/v1/fuel/expense-categories', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;
    const input = z
      .object({
        name: z.string().min(1).max(80),
        code: z
          .string()
          .min(1)
          .max(40)
          .regex(/^[A-Za-z0-9_-]+$/, 'Code must be letters, numbers, _ or -'),
        sortOrder: z.number().int().optional(),
      })
      .parse(request.body);

    const code = input.code.toUpperCase();
    const existing = await prisma.expenseCategory.findFirst({
      where: { businessId: user.main_business_id, code },
    });
    if (existing) {
      return sendApiError(reply, 409, 'An expense category with this code already exists.', {
        code: 'DUPLICATE',
        fields: { code: 'Already used.' },
      });
    }

    const created = await prisma.expenseCategory.create({
      data: {
        id: randomUUID(),
        businessId: user.main_business_id,
        name: input.name.trim(),
        code,
        sortOrder: input.sortOrder ?? 100,
      },
    });
    return reply.code(201).send(created);
  });

  app.post('/api/v1/fuel/expense-categories/defaults', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;

    const existing = await prisma.expenseCategory.findMany({
      where: { businessId: user.main_business_id },
      select: { code: true },
    });
    const have = new Set(existing.map((row) => row.code));
    const toCreate = DEFAULT_CATEGORIES.filter((row) => !have.has(row.code));

    if (toCreate.length === 0) {
      return reply.send({
        created: 0,
        categories: await prisma.expenseCategory.findMany({
          where: { businessId: user.main_business_id, active: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
      });
    }

    await prisma.expenseCategory.createMany({
      data: toCreate.map((row) => ({
        id: randomUUID(),
        businessId: user.main_business_id,
        name: row.name,
        code: row.code,
        sortOrder: row.sortOrder,
      })),
    });

    return reply.send({
      created: toCreate.length,
      categories: await prisma.expenseCategory.findMany({
        where: { businessId: user.main_business_id, active: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
    });
  });

  app.patch('/api/v1/fuel/expense-categories/:id', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;
    const params = z.object({ id }).parse(request.params);
    const input = z
      .object({
        name: z.string().min(1).max(80).optional(),
        sortOrder: z.number().int().optional(),
        active: z.boolean().optional(),
      })
      .parse(request.body);

    const category = await prisma.expenseCategory.findFirst({
      where: { id: params.id, businessId: user.main_business_id },
    });
    if (!category) return reply.code(404).send({ message: 'Expense category not found.' });

    return reply.send(
      await prisma.expenseCategory.update({
        where: { id: category.id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        },
      })
    );
  });

  app.get('/api/v1/fuel/expenses', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z
      .object({
        stationId: id,
        businessDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .parse(request.query);

    const station = await prisma.station.findFirst({
      where: { id: query.stationId, businessId: user.main_business_id },
    });
    if (!station) return reply.code(404).send({ message: 'Station not found.' });

    const ymd = query.businessDate ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
    const { start, end } = karachiDayBounds(ymd);
    const monthStart = new Date(`${ymd.slice(0, 7)}-01T00:00:00.000+05:00`);
    const monthEnd = end;

    const [dayRows, cashPaidOutAgg, monthlyCashAgg, allDayCount] = await Promise.all([
      prisma.expense.findMany({
        where: { stationId: station.id, spentAt: { gte: start, lte: end } },
        include: { expenseCategory: { select: { id: true, name: true, code: true } } },
        orderBy: { spentAt: 'desc' },
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
      prisma.expense.aggregate({
        where: {
          stationId: station.id,
          spentAt: { gte: monthStart, lte: monthEnd },
          paidFromTodaysCash: true,
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expense.count({
        where: { stationId: station.id, spentAt: { gte: start, lte: end } },
      }),
    ]);

    return reply.send({
      businessDate: ymd,
      /** Paper-form “Total Credits” / Daily Closing cash paid out. */
      cashPaidOutTotal: num(cashPaidOutAgg._sum.amount),
      cashPaidOutCount: cashPaidOutAgg._count,
      monthlyCashPaidOutTotal: num(monthlyCashAgg._sum.amount),
      monthlyCashPaidOutCount: monthlyCashAgg._count,
      dailyCount: allDayCount,
      expenses: dayRows.map(serializeExpense),
    });
  });

  app.post('/api/v1/fuel/expenses', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const input = z
      .object({
        stationId: id,
        categoryId: id.optional(),
        category: z.string().min(1).max(80).optional(),
        name: z.string().min(1).max(120),
        description: z.string().max(500).optional().default(''),
        amount: positive,
        method: z.enum(EXPENSE_METHODS),
        spentAt: date.optional(),
        reference: z.string().max(120).optional(),
        attachmentUrl: z.string().max(500).optional(),
        paidFromTodaysCash: z.boolean().optional().default(true),
      })
      .parse(request.body);

    const station = await prisma.station.findFirst({
      where: { id: input.stationId, businessId: user.main_business_id },
    });
    if (!station) return reply.code(404).send({ message: 'Station not found.' });

    let categoryLabel = input.category?.trim() ?? '';
    let categoryId: string | null = null;

    if (input.categoryId) {
      const cat = await prisma.expenseCategory.findFirst({
        where: {
          id: input.categoryId,
          businessId: user.main_business_id,
          active: true,
        },
      });
      if (!cat) {
        return sendApiError(reply, 400, 'Expense category not found.', {
          code: 'VALIDATION',
          fields: { categoryId: 'Select a valid category.' },
        });
      }
      categoryId = cat.id;
      categoryLabel = cat.name;
    }

    if (!categoryLabel) {
      return sendApiError(reply, 400, 'Category is required.', {
        code: 'VALIDATION',
        fields: { categoryId: 'Select or enter a category.' },
      });
    }

    const created = await prisma.expense.create({
      data: {
        id: randomUUID(),
        stationId: station.id,
        categoryId,
        category: categoryLabel,
        name: input.name.trim(),
        description: input.description?.trim() || input.name.trim(),
        amount: input.amount,
        method: input.method,
        spentAt: input.spentAt ?? new Date(),
        reference: input.reference?.trim() || null,
        attachmentUrl: input.attachmentUrl?.trim() || null,
        paidFromTodaysCash: input.paidFromTodaysCash ?? true,
        createdBy: user.id,
      },
      include: { expenseCategory: { select: { id: true, name: true, code: true } } },
    });

    return reply.code(201).send(serializeExpense(created));
  });
};
