-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "businessDayId" TEXT;
CREATE INDEX "Sale_businessDayId_idx" ON "Sale"("businessDayId");
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_businessDayId_fkey" FOREIGN KEY ("businessDayId") REFERENCES "BusinessDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "SaleLine" ADD COLUMN "rateOverrideReason" TEXT;
