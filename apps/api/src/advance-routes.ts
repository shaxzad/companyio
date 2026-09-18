import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { User as AuthUser } from '@companyio/auth-contracts';
import { sendApiError } from './http-errors.ts';

type Authenticator = (authorization?: string) => Promise<AuthUser | null>;

const id = z.string().min(1);
const positive = z.number().positive();
const yearMonthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM');
const METHODS = ['CASH', 'BANK', 'TRANSFER'] as const;

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

const round2 = (value: number) => Math.round(value * 100) / 100;

type ObligationStatus = 'DUE' | 'ADVANCE' | 'FULLY_PAID';

const statusFor = (
  monthlyAmount: number,
  paidTotal: number,
  hasFinal: boolean
): ObligationStatus => {
  if (paidTotal <= 0) return 'DUE';
  if (paidTotal + 0.001 >= monthlyAmount || hasFinal) return 'FULLY_PAID';
  return 'ADVANCE';
};

const serializePayment = (payment: {
  id: string;
  obligationId: string;
  amount: unknown;
  method: string;
  paidAt: Date;
  notes: string | null;
  isFinal: boolean;
  createdBy: string;
  createdAt: Date;
}) => ({
  id: payment.id,
  obligationId: payment.obligationId,
  amount: num(payment.amount),
  method: payment.method,
  paidAt: payment.paidAt.toISOString(),
  notes: payment.notes,
  isFinal: payment.isFinal,
  createdBy: payment.createdBy,
  createdAt: payment.createdAt.toISOString(),
});

const serializeObligation = (row: {
  id: string;
  businessId: string;
  stationId: string | null;
  kind: string;
  scopeKey: string;
  employeeId: string | null;
  yearMonth: string;
  monthlyAmount: unknown;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  employee?: { id: string; name: string; code: string | null } | null;
  payments: Array<{
    id: string;
    obligationId: string;
    amount: unknown;
    method: string;
    paidAt: Date;
    notes: string | null;
    isFinal: boolean;
    createdBy: string;
    createdAt: Date;
  }>;
}) => {
  const monthlyAmount = num(row.monthlyAmount);
  const paidTotal = round2(row.payments.reduce((sum, payment) => sum + num(payment.amount), 0));
  const remaining = round2(Math.max(0, monthlyAmount - paidTotal));
  const hasFinal = row.payments.some((payment) => payment.isFinal);
  return {
    id: row.id,
    businessId: row.businessId,
    stationId: row.stationId,
    kind: row.kind,
    employeeId: row.employeeId,
    yearMonth: row.yearMonth,
    monthlyAmount,
    paidTotal,
    remaining,
    status: statusFor(monthlyAmount, paidTotal, hasFinal),
    notes: row.notes,
    employee: row.employee ?? null,
    payments: row.payments
      .slice()
      .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())
      .map(serializePayment),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

export const registerAdvanceRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  authenticate: Authenticator
) => {
  app.get('/api/v1/fuel/employees', async (request, reply) => {
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
      (
        await prisma.employee.findMany({
          where: {
            businessId: user.main_business_id,
            ...(query.includeInactive ? {} : { active: true }),
          },
          orderBy: { name: 'asc' },
        })
      ).map((employee) => ({
        ...employee,
        defaultMonthlySalary: num(employee.defaultMonthlySalary),
      }))
    );
  });

  app.post('/api/v1/fuel/employees', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    if (user.role !== 'owner' && user.role !== 'manager') {
      return sendApiError(reply, 403, 'Only owner or manager can add employees.', {
        code: 'FORBIDDEN',
      });
    }

    const input = z
      .object({
        name: z.string().trim().min(1).max(120),
        code: z.string().trim().max(40).optional(),
        defaultMonthlySalary: z.number().nonnegative().optional(),
      })
      .parse(request.body);

    const duplicate = await prisma.employee.findFirst({
      where: {
        businessId: user.main_business_id,
        name: { equals: input.name, mode: 'insensitive' },
      },
    });
    if (duplicate) {
      return sendApiError(reply, 409, `Employee “${duplicate.name}” already exists.`, {
        code: 'DUPLICATE',
        fields: { name: 'This employee name is already used.' },
      });
    }

    const created = await prisma.employee.create({
      data: {
        id: randomUUID(),
        businessId: user.main_business_id,
        name: input.name,
        code: input.code?.trim() || null,
        defaultMonthlySalary: input.defaultMonthlySalary ?? 0,
      },
    });

    return reply.code(201).send({
      ...created,
      defaultMonthlySalary: num(created.defaultMonthlySalary),
    });
  });

  app.patch('/api/v1/fuel/employees/:id', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    if (user.role !== 'owner' && user.role !== 'manager') {
      return sendApiError(reply, 403, 'Only owner or manager can update employees.', {
        code: 'FORBIDDEN',
      });
    }
    const params = z.object({ id }).parse(request.params);
    const input = z
      .object({
        name: z.string().trim().min(1).max(120).optional(),
        code: z.string().trim().max(40).nullable().optional(),
        defaultMonthlySalary: z.number().nonnegative().optional(),
        active: z.boolean().optional(),
      })
      .parse(request.body);

    const employee = await prisma.employee.findFirst({
      where: { id: params.id, businessId: user.main_business_id },
    });
    if (!employee) return reply.code(404).send({ message: 'Employee not found.' });

    if (input.name) {
      const duplicate = await prisma.employee.findFirst({
        where: {
          businessId: user.main_business_id,
          id: { not: employee.id },
          name: { equals: input.name, mode: 'insensitive' },
        },
      });
      if (duplicate) {
        return sendApiError(reply, 409, `Employee “${duplicate.name}” already exists.`, {
          code: 'DUPLICATE',
          fields: { name: 'This employee name is already used.' },
        });
      }
    }

    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.code !== undefined ? { code: input.code?.trim() || null } : {}),
        ...(input.defaultMonthlySalary !== undefined
          ? { defaultMonthlySalary: input.defaultMonthlySalary }
          : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });

    return reply.send({
      ...updated,
      defaultMonthlySalary: num(updated.defaultMonthlySalary),
    });
  });

  app.get('/api/v1/fuel/obligations', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z
      .object({
        kind: z.enum(['RENT', 'SALARY']),
        yearMonth: yearMonthSchema.optional(),
      })
      .parse(request.query);

    const yearMonth =
      query.yearMonth ??
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date()).slice(0, 7);

    const rows = await prisma.monthlyObligation.findMany({
      where: {
        businessId: user.main_business_id,
        kind: query.kind,
        yearMonth,
      },
      include: {
        employee: { select: { id: true, name: true, code: true } },
        payments: true,
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    const obligations = rows.map(serializeObligation);
    return reply.send({
      kind: query.kind,
      yearMonth,
      obligations,
      totalMonthly: round2(obligations.reduce((sum, row) => sum + row.monthlyAmount, 0)),
      totalPaid: round2(obligations.reduce((sum, row) => sum + row.paidTotal, 0)),
      totalRemaining: round2(obligations.reduce((sum, row) => sum + row.remaining, 0)),
    });
  });

  /** Create or update the monthly obligation amount (rent or per-employee salary). */
  app.post('/api/v1/fuel/obligations', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;

    const input = z
      .object({
        kind: z.enum(['RENT', 'SALARY']),
        yearMonth: yearMonthSchema,
        monthlyAmount: positive,
        employeeId: id.optional(),
        stationId: id.optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(request.body);

    if (input.kind === 'SALARY' && !input.employeeId) {
      return sendApiError(reply, 400, 'Employee is required for salary obligations.', {
        fields: { employeeId: 'Select an employee.' },
      });
    }
    if (input.kind === 'RENT' && input.employeeId) {
      return sendApiError(reply, 400, 'Rent obligations cannot be linked to an employee.', {
        fields: { employeeId: 'Leave employee empty for rent.' },
      });
    }

    let employeeId: string | null = null;
    let scopeKey = 'RENT';

    if (input.kind === 'SALARY') {
      const employee = await prisma.employee.findFirst({
        where: {
          id: input.employeeId!,
          businessId: user.main_business_id,
          active: true,
        },
      });
      if (!employee) {
        return sendApiError(reply, 404, 'Employee not found.', {
          fields: { employeeId: 'Employee not found.' },
        });
      }
      employeeId = employee.id;
      scopeKey = employee.id;
    }

    if (input.stationId) {
      const station = await prisma.station.findFirst({
        where: { id: input.stationId, businessId: user.main_business_id },
      });
      if (!station) return reply.code(404).send({ message: 'Station not found.' });
    }

    const existing = await prisma.monthlyObligation.findFirst({
      where: {
        businessId: user.main_business_id,
        kind: input.kind,
        scopeKey,
        yearMonth: input.yearMonth,
      },
    });

    const row = existing
      ? await prisma.monthlyObligation.update({
          where: { id: existing.id },
          data: {
            monthlyAmount: input.monthlyAmount,
            stationId: input.stationId ?? existing.stationId,
            notes: input.notes?.trim() || existing.notes,
          },
          include: {
            employee: { select: { id: true, name: true, code: true } },
            payments: true,
          },
        })
      : await prisma.monthlyObligation.create({
          data: {
            id: randomUUID(),
            businessId: user.main_business_id,
            stationId: input.stationId ?? null,
            kind: input.kind,
            scopeKey,
            employeeId,
            yearMonth: input.yearMonth,
            monthlyAmount: input.monthlyAmount,
            notes: input.notes?.trim() || null,
          },
          include: {
            employee: { select: { id: true, name: true, code: true } },
            payments: true,
          },
        });

    return reply.code(existing ? 200 : 201).send(serializeObligation(row));
  });

  app.post('/api/v1/fuel/obligations/:id/payments', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const params = z.object({ id }).parse(request.params);
    const input = z
      .object({
        amount: positive,
        method: z.enum(METHODS),
        paidAt: z.coerce.date().optional(),
        notes: z.string().max(500).optional(),
        isFinal: z.boolean().optional(),
      })
      .parse(request.body);

    const obligation = await prisma.monthlyObligation.findFirst({
      where: { id: params.id, businessId: user.main_business_id },
      include: { payments: true, employee: { select: { id: true, name: true, code: true } } },
    });
    if (!obligation) return reply.code(404).send({ message: 'Obligation not found.' });

    const paidSoFar = obligation.payments.reduce((sum, payment) => sum + num(payment.amount), 0);
    const monthly = num(obligation.monthlyAmount);
    if (paidSoFar + input.amount > monthly + 0.01 && !input.isFinal) {
      return sendApiError(
        reply,
        400,
        `Payment would exceed remaining balance (${round2(Math.max(0, monthly - paidSoFar)).toFixed(2)}). Mark as final payment if intentional.`,
        { fields: { amount: 'Exceeds remaining for this month.' }, code: 'OVERPAY' }
      );
    }

    await prisma.obligationPayment.create({
      data: {
        id: randomUUID(),
        obligationId: obligation.id,
        amount: input.amount,
        method: input.method,
        paidAt: input.paidAt ?? new Date(),
        notes: input.notes?.trim() || null,
        isFinal: input.isFinal ?? false,
        createdBy: user.id,
      },
    });

    const refreshed = await prisma.monthlyObligation.findFirstOrThrow({
      where: { id: obligation.id },
      include: {
        employee: { select: { id: true, name: true, code: true } },
        payments: true,
      },
    });

    return reply.code(201).send(serializeObligation(refreshed));
  });

  app.get('/api/v1/fuel/employees/:id/salary-history', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const params = z.object({ id }).parse(request.params);

    const employee = await prisma.employee.findFirst({
      where: { id: params.id, businessId: user.main_business_id },
    });
    if (!employee) return reply.code(404).send({ message: 'Employee not found.' });

    const obligations = await prisma.monthlyObligation.findMany({
      where: {
        businessId: user.main_business_id,
        kind: 'SALARY',
        employeeId: employee.id,
      },
      include: {
        employee: { select: { id: true, name: true, code: true } },
        payments: true,
      },
      orderBy: { yearMonth: 'desc' },
    });

    return reply.send({
      employee: {
        id: employee.id,
        name: employee.name,
        code: employee.code,
        defaultMonthlySalary: num(employee.defaultMonthlySalary),
        active: employee.active,
      },
      history: obligations.map(serializeObligation),
    });
  });
};
