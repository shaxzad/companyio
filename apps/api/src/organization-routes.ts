import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { User as AuthUser } from '@companyio/auth-contracts';
import { sendApiError } from './http-errors.ts';

type Authenticator = (authorization?: string) => Promise<AuthUser | null>;

const id = z.string().min(1);
const creditType = z.enum(['DAILY', 'MONTHLY', 'BOTH']);

const organizationCreate = z.object({
  name: z
    .string({ required_error: 'Company name is required.' })
    .trim()
    .min(1, 'Company name is required.')
    .max(160),
  contactName: z.string().trim().max(120).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.')
    .optional()
    .or(z.literal('')),
  address: z.string().trim().max(240).optional().or(z.literal('')),
  paymentTerms: z.string().trim().max(80).optional().or(z.literal('')),
  creditLimit: z.number().nonnegative('Credit limit cannot be negative.').optional(),
  creditType: creditType.optional(),
  active: z.boolean().optional(),
});

const organizationUpdate = organizationCreate.partial();

const vehicleCreate = z.object({
  registration: z
    .string({ required_error: 'Vehicle number is required.' })
    .trim()
    .min(1, 'Vehicle number is required.')
    .max(30),
  type: z.string().trim().max(80).optional().or(z.literal('')),
  makeModel: z.string().trim().max(120).optional().or(z.literal('')),
  driver: z.string().trim().max(120).optional().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  active: z.boolean().optional(),
});

const vehicleUpdate = vehicleCreate.partial();

const emptyToUndefined = <T extends Record<string, unknown>>(input: T) => {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === '') continue;
    next[key] = value;
  }
  return next as T;
};

const requireUser = async (
  request: { headers: { authorization?: string } },
  reply: { code: (status: number) => { send: (body: unknown) => unknown } },
  authenticate: Authenticator
) => {
  const user = await authenticate(request.headers.authorization);
  if (!user) {
    reply.code(401).send({ message: 'Authentication required.' });
    return null;
  }
  return user;
};

const canManageCredit = (role: string | undefined) =>
  role === 'owner' || role === 'manager' || role === 'accountant';

export const registerOrganizationRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  authenticate: Authenticator
) => {
  app.get('/api/v1/fuel/organizations', async (request, reply) => {
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
      await prisma.organization.findMany({
        where: {
          businessId: user.main_business_id,
          ...(query.includeInactive ? {} : { active: true }),
        },
        include: {
          vehicles: {
            where: query.includeInactive ? undefined : { active: true },
            orderBy: { registration: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      })
    );
  });

  app.get('/api/v1/fuel/organizations/:organizationId', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const params = z.object({ organizationId: id }).parse(request.params);
    const organization = await prisma.organization.findFirst({
      where: { id: params.organizationId, businessId: user.main_business_id },
      include: { vehicles: { orderBy: { registration: 'asc' } } },
    });
    if (!organization) return sendApiError(reply, 404, 'Company not found.', { code: 'NOT_FOUND' });
    return reply.send(organization);
  });

  app.post('/api/v1/fuel/organizations', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    if (!canManageCredit(user.role)) {
      return sendApiError(reply, 403, 'You cannot manage companies.', { code: 'FORBIDDEN' });
    }
    const input = emptyToUndefined(organizationCreate.parse(request.body));
    return reply.code(201).send(
      await prisma.organization.create({
        data: {
          id: randomUUID(),
          businessId: user.main_business_id,
          name: input.name,
          contactName: input.contactName,
          phone: input.phone,
          email: input.email,
          address: input.address,
          paymentTerms: input.paymentTerms,
          creditLimit: input.creditLimit ?? 0,
          creditType: input.creditType ?? 'BOTH',
          active: input.active ?? true,
        },
        include: { vehicles: true },
      })
    );
  });

  app.patch('/api/v1/fuel/organizations/:organizationId', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    if (!canManageCredit(user.role)) {
      return sendApiError(reply, 403, 'You cannot manage companies.', { code: 'FORBIDDEN' });
    }
    const params = z.object({ organizationId: id }).parse(request.params);
    const input = emptyToUndefined(organizationUpdate.parse(request.body));
    const existing = await prisma.organization.findFirst({
      where: { id: params.organizationId, businessId: user.main_business_id },
    });
    if (!existing) return sendApiError(reply, 404, 'Company not found.', { code: 'NOT_FOUND' });

    return reply.send(
      await prisma.organization.update({
        where: { id: existing.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.contactName !== undefined ? { contactName: input.contactName || null } : {}),
          ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
          ...(input.email !== undefined ? { email: input.email || null } : {}),
          ...(input.address !== undefined ? { address: input.address || null } : {}),
          ...(input.paymentTerms !== undefined
            ? { paymentTerms: input.paymentTerms || null }
            : {}),
          ...(input.creditLimit !== undefined ? { creditLimit: input.creditLimit } : {}),
          ...(input.creditType !== undefined ? { creditType: input.creditType } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        },
        include: { vehicles: { orderBy: { registration: 'asc' } } },
      })
    );
  });

  app.post('/api/v1/fuel/organizations/:organizationId/vehicles', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    if (!canManageCredit(user.role)) {
      return sendApiError(reply, 403, 'You cannot manage vehicles.', { code: 'FORBIDDEN' });
    }
    const params = z.object({ organizationId: id }).parse(request.params);
    const organization = await prisma.organization.findFirst({
      where: { id: params.organizationId, businessId: user.main_business_id },
    });
    if (!organization) return sendApiError(reply, 404, 'Company not found.', { code: 'NOT_FOUND' });
    const input = emptyToUndefined(vehicleCreate.parse(request.body));

    try {
      return reply.code(201).send(
        await prisma.vehicle.create({
          data: {
            id: randomUUID(),
            organizationId: organization.id,
            registration: input.registration.toUpperCase(),
            type: input.type || null,
            makeModel: input.makeModel || null,
            driver: input.driver || null,
            notes: input.notes || null,
            active: input.active ?? true,
          },
        })
      );
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        return sendApiError(reply, 409, 'That vehicle number already exists for this company.', {
          code: 'CONFLICT',
          fields: { registration: 'That vehicle number already exists for this company.' },
        });
      }
      throw error;
    }
  });

  app.patch('/api/v1/fuel/vehicles/:vehicleId', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    if (!canManageCredit(user.role)) {
      return sendApiError(reply, 403, 'You cannot manage vehicles.', { code: 'FORBIDDEN' });
    }
    const params = z.object({ vehicleId: id }).parse(request.params);
    const input = emptyToUndefined(vehicleUpdate.parse(request.body));
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: params.vehicleId,
        organization: { businessId: user.main_business_id },
      },
    });
    if (!vehicle) return sendApiError(reply, 404, 'Vehicle not found.', { code: 'NOT_FOUND' });

    try {
      return reply.send(
        await prisma.vehicle.update({
          where: { id: vehicle.id },
          data: {
            ...(input.registration !== undefined
              ? { registration: input.registration.toUpperCase() }
              : {}),
            ...(input.type !== undefined ? { type: input.type || null } : {}),
            ...(input.makeModel !== undefined ? { makeModel: input.makeModel || null } : {}),
            ...(input.driver !== undefined ? { driver: input.driver || null } : {}),
            ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
            ...(input.active !== undefined ? { active: input.active } : {}),
          },
        })
      );
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        return sendApiError(reply, 409, 'That vehicle number already exists for this company.', {
          code: 'CONFLICT',
          fields: { registration: 'That vehicle number already exists for this company.' },
        });
      }
      throw error;
    }
  });

  app.get('/api/v1/fuel/vehicles', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z
      .object({
        organizationId: id.optional(),
        includeInactive: z
          .union([z.literal('true'), z.literal('false'), z.boolean()])
          .optional()
          .transform((value) => value === true || value === 'true'),
      })
      .parse(request.query);

    return reply.send(
      await prisma.vehicle.findMany({
        where: {
          organization: {
            businessId: user.main_business_id,
            ...(query.organizationId ? { id: query.organizationId } : {}),
          },
          ...(query.includeInactive ? {} : { active: true }),
        },
        include: {
          organization: { select: { id: true, name: true, active: true } },
        },
        orderBy: [{ registration: 'asc' }],
      })
    );
  });
};
