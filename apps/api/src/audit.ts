import { randomUUID } from 'node:crypto';
import type { Prisma } from './generated/prisma/client.ts';
import type { PrismaClient } from './generated/prisma/client.ts';
import { sendApiError } from './http-errors.ts';
import type { FastifyReply } from 'fastify';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'
>;

export type AuditWriteInput = {
  businessId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Prisma.InputJsonValue;
};

export async function writeAuditLog(db: Tx | PrismaClient, input: AuditWriteInput) {
  return db.auditLog.create({
    data: {
      id: randomUUID(),
      businessId: input.businessId,
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      details: input.details ?? undefined,
    },
  });
}

/**
 * Locked days (RECONCILED / CLOSED) may only be changed with a recorded reason.
 * OPEN days are freely editable. No day → treat as editable (caller may still require open day).
 */
export async function assertDayChangeAllowed(
  prisma: PrismaClient,
  reply: FastifyReply,
  args: {
    stationId: string;
    businessDateYmd: string;
    auditReason?: string | null;
  }
): Promise<
  { allowed: true; dayStatus: string | null; reason: string | null } | { allowed: false }
> {
  const businessDate = new Date(`${args.businessDateYmd}T00:00:00.000Z`);
  const day = await prisma.businessDay.findUnique({
    where: {
      stationId_businessDate: { stationId: args.stationId, businessDate },
    },
    select: { id: true, status: true },
  });

  if (!day || day.status === 'OPEN') {
    return { allowed: true, dayStatus: day?.status ?? null, reason: null };
  }

  const reason = args.auditReason?.trim() ?? '';
  if (reason.length < 8) {
    sendApiError(
      reply,
      403,
      `This business day is ${day.status === 'CLOSED' ? 'closed' : 'reconciled'} (locked). Provide auditReason (at least 8 characters) to record why you are changing it.`,
      {
        code: 'LOCKED_DAY_REASON_REQUIRED',
        fields: { auditReason: 'Reason is required for locked / closed-day changes.' },
      }
    );
    return { allowed: false };
  }

  return { allowed: true, dayStatus: day.status, reason };
}

export const BACKDATED_POLICIES = ['ALLOW', 'REQUIRE_APPROVAL'] as const;
export type BackdatedEntryPolicy = (typeof BACKDATED_POLICIES)[number];

export const DEFAULT_BACKDATED_POLICY: BackdatedEntryPolicy = 'ALLOW';

export const parseBackdatedPolicy = (raw: unknown): BackdatedEntryPolicy => {
  const record =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return BACKDATED_POLICIES.includes(record.backdatedEntryPolicy as BackdatedEntryPolicy)
    ? (record.backdatedEntryPolicy as BackdatedEntryPolicy)
    : DEFAULT_BACKDATED_POLICY;
};
