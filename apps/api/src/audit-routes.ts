import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { User as AuthUser } from '@companyio/auth-contracts';
import { sendApiError } from './http-errors.ts';
import { BACKDATED_POLICIES, DEFAULT_BACKDATED_POLICY, parseBackdatedPolicy } from './audit.ts';
import { parsePnlSettings } from './pnl.ts';

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

const requireAuditViewer = async (
  request: FastifyRequest,
  reply: FastifyReply,
  authenticate: Authenticator
) => {
  const user = await requireUser(request, reply, authenticate);
  if (!user) return null;
  if (!['owner', 'manager', 'accountant'].includes(user.role)) {
    sendApiError(reply, 403, 'Your role cannot view the audit log.', { code: 'FORBIDDEN' });
    return null;
  }
  return user;
};

export const registerAuditRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  authenticate: Authenticator
) => {
  app.get('/api/v1/fuel/audit-logs', async (request, reply) => {
    const user = await requireAuditViewer(request, reply, authenticate);
    if (!user) return;

    const query = z
      .object({
        from: ymd.optional(),
        to: ymd.optional(),
        userId: id.optional(),
        entityType: z.string().min(1).max(80).optional(),
        action: z.string().min(1).max(80).optional(),
        entityId: id.optional(),
        limit: z.coerce.number().int().min(1).max(200).optional().default(50),
        offset: z.coerce.number().int().min(0).optional().default(0),
      })
      .parse(request.query);

    const createdAt =
      query.from || query.to
        ? {
            ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000+05:00`) } : {}),
            ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999+05:00`) } : {}),
          }
        : undefined;

    const where = {
      businessId: user.main_business_id,
      ...(createdAt ? { createdAt } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
    };

    const [rows, total, users, entityTypes, actions] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.auditLog.count({ where }),
      prisma.user.findMany({
        where: { main_business_id: user.main_business_id },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' },
      }),
      prisma.auditLog.findMany({
        where: { businessId: user.main_business_id },
        distinct: ['entityType'],
        select: { entityType: true },
        orderBy: { entityType: 'asc' },
        take: 100,
      }),
      prisma.auditLog.findMany({
        where: { businessId: user.main_business_id },
        distinct: ['action'],
        select: { action: true },
        orderBy: { action: 'asc' },
        take: 100,
      }),
    ]);

    const userById = new Map(users.map((row) => [row.id, row]));

    return reply.send({
      total,
      limit: query.limit,
      offset: query.offset,
      filters: {
        users: users.map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
        })),
        entityTypes: entityTypes.map((row) => row.entityType),
        actions: actions.map((row) => row.action),
      },
      logs: rows.map((row) => {
        const actor = userById.get(row.userId);
        const details =
          row.details && typeof row.details === 'object' && !Array.isArray(row.details)
            ? (row.details as Record<string, unknown>)
            : null;
        return {
          id: row.id,
          action: row.action,
          entityType: row.entityType,
          entityId: row.entityId,
          createdAt: row.createdAt.toISOString(),
          userId: row.userId,
          userName: actor?.name ?? 'Unknown user',
          userEmail: actor?.email ?? null,
          userRole: actor?.role ?? null,
          reason:
            typeof details?.reason === 'string'
              ? details.reason
              : typeof details?.auditReason === 'string'
                ? details.auditReason
                : null,
          before: details?.before ?? null,
          after: details?.after ?? null,
          details,
        };
      }),
    });
  });

  app.get('/api/v1/fuel/audit-settings', async (request, reply) => {
    const user = await requireAuditViewer(request, reply, authenticate);
    if (!user) return;

    const business = await prisma.business.findUnique({
      where: { id: user.main_business_id },
      select: { settings: true },
    });

    return reply.send({
      backdatedEntryPolicy: parseBackdatedPolicy(business?.settings),
      defaults: { backdatedEntryPolicy: DEFAULT_BACKDATED_POLICY },
      options: { backdatedEntryPolicy: [...BACKDATED_POLICIES] },
      section5Note:
        'Backdated-entry approval is a Section 5 placeholder — not a permanent policy yet.',
      reopenPolicy: parsePnlSettings(business?.settings).reopenPolicy,
    });
  });

  app.patch('/api/v1/fuel/audit-settings', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    if (user.role !== 'owner') {
      return sendApiError(reply, 403, 'Only the owner can change audit placeholders.', {
        code: 'FORBIDDEN',
      });
    }

    const input = z
      .object({
        backdatedEntryPolicy: z.enum(BACKDATED_POLICIES).optional(),
      })
      .parse(request.body);

    const business = await prisma.business.findUnique({
      where: { id: user.main_business_id },
      select: { settings: true },
    });
    const existing =
      business?.settings &&
      typeof business.settings === 'object' &&
      !Array.isArray(business.settings)
        ? (business.settings as Record<string, unknown>)
        : {};

    const next = {
      ...existing,
      ...(input.backdatedEntryPolicy ? { backdatedEntryPolicy: input.backdatedEntryPolicy } : {}),
    };

    await prisma.business.update({
      where: { id: user.main_business_id },
      data: { settings: next },
    });

    return reply.send({
      backdatedEntryPolicy: parseBackdatedPolicy(next),
      section5Note: 'Saved as a configurable placeholder until Section 5 is confirmed.',
    });
  });
};
