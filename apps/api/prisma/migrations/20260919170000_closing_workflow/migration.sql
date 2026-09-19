-- Feature 15: Draft (OPEN) → Reconciled → Closed workflow
ALTER TYPE "BusinessDayStatus" ADD VALUE IF NOT EXISTS 'RECONCILED';

ALTER TABLE "BusinessDay" ADD COLUMN IF NOT EXISTS "reconciledAt" TIMESTAMP(3);
ALTER TABLE "BusinessDay" ADD COLUMN IF NOT EXISTS "reconciledBy" TEXT;
