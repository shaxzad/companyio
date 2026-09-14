-- AlterTable
ALTER TABLE "Station" ADD COLUMN "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "Nozzle" ADD COLUMN "tankId" TEXT;

-- CreateTable
CREATE TABLE "CashDenomination" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "label" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CashDenomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellingRate" (
    "id" TEXT NOT NULL,
    "fuelTypeId" TEXT NOT NULL,
    "sellingPrice" DECIMAL(14,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellingRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashDenomination_businessId_value_key" ON "CashDenomination"("businessId", "value");
CREATE INDEX "CashDenomination_businessId_idx" ON "CashDenomination"("businessId");
CREATE INDEX "SellingRate_fuelTypeId_effectiveFrom_idx" ON "SellingRate"("fuelTypeId", "effectiveFrom");
CREATE INDEX "Nozzle_tankId_idx" ON "Nozzle"("tankId");

-- AddForeignKey
ALTER TABLE "Nozzle" ADD CONSTRAINT "Nozzle_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SellingRate" ADD CONSTRAINT "SellingRate_fuelTypeId_fkey" FOREIGN KEY ("fuelTypeId") REFERENCES "FuelType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashDenomination" ADD CONSTRAINT "CashDenomination_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
