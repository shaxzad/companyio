-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('owner', 'manager', 'staff', 'accountant');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'owner';
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
