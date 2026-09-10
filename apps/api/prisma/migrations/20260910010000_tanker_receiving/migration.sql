-- CreateEnum
CREATE TYPE "AccessRateMode" AS ENUM ('PURCHASE', 'SELLING');

-- AlterTable
ALTER TABLE "FuelReceipt" ADD COLUMN "businessDayId" TEXT;
ALTER TABLE "FuelReceipt" ADD COLUMN "expectedLitres" DECIMAL(14,3);
ALTER TABLE "FuelReceipt" ADD COLUMN "actualLitres" DECIMAL(14,3);
ALTER TABLE "FuelReceipt" ADD COLUMN "totalDip" DECIMAL(14,3);
ALTER TABLE "FuelReceipt" ADD COLUMN "receivedDip" DECIMAL(14,3);
ALTER TABLE "FuelReceipt" ADD COLUMN "accessLitres" DECIMAL(14,3) NOT NULL DEFAULT 0;
ALTER TABLE "FuelReceipt" ADD COLUMN "shortageLitres" DECIMAL(14,3) NOT NULL DEFAULT 0;
ALTER TABLE "FuelReceipt" ADD COLUMN "purchaseRate" DECIMAL(14,2);
ALTER TABLE "FuelReceipt" ADD COLUMN "accessRateMode" "AccessRateMode" NOT NULL DEFAULT 'PURCHASE';
ALTER TABLE "FuelReceipt" ADD COLUMN "accessRate" DECIMAL(14,2);
ALTER TABLE "FuelReceipt" ADD COLUMN "fuelCost" DECIMAL(14,2);
ALTER TABLE "FuelReceipt" ADD COLUMN "tankerTip" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "FuelReceipt" ADD COLUMN "otherReceivingCost" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- Backfill existing rows from receipt lines when present
UPDATE "FuelReceipt" fr
SET
  "expectedLitres" = COALESCE((SELECT SUM(rl."litres") FROM "ReceiptLine" rl WHERE rl."receiptId" = fr."id"), 0),
  "actualLitres" = COALESCE((SELECT SUM(rl."litres") FROM "ReceiptLine" rl WHERE rl."receiptId" = fr."id"), 0),
  "purchaseRate" = COALESCE((SELECT MIN(rl."purchasePrice") FROM "ReceiptLine" rl WHERE rl."receiptId" = fr."id"), 0),
  "accessRate" = COALESCE((SELECT MIN(rl."purchasePrice") FROM "ReceiptLine" rl WHERE rl."receiptId" = fr."id"), 0),
  "fuelCost" = fr."totalCost"
WHERE "expectedLitres" IS NULL;

ALTER TABLE "FuelReceipt" ALTER COLUMN "expectedLitres" SET NOT NULL;
ALTER TABLE "FuelReceipt" ALTER COLUMN "actualLitres" SET NOT NULL;
ALTER TABLE "FuelReceipt" ALTER COLUMN "purchaseRate" SET NOT NULL;
ALTER TABLE "FuelReceipt" ALTER COLUMN "accessRate" SET NOT NULL;
ALTER TABLE "FuelReceipt" ALTER COLUMN "fuelCost" SET NOT NULL;

CREATE INDEX "FuelReceipt_businessDayId_idx" ON "FuelReceipt"("businessDayId");
CREATE INDEX "ReceiptLine_tankId_receiptId_idx" ON "ReceiptLine"("tankId", "receiptId");

ALTER TABLE "FuelReceipt" ADD CONSTRAINT "FuelReceipt_businessDayId_fkey" FOREIGN KEY ("businessDayId") REFERENCES "BusinessDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;
