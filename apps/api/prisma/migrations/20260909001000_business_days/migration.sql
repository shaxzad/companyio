-- CreateEnum
CREATE TYPE "BusinessDayStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateTable
CREATE TABLE "BusinessDay" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "status" "BusinessDayStatus" NOT NULL DEFAULT 'OPEN',
    "bbfCash" DECIMAL(14,2) NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedBy" TEXT NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overrideReason" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,

    CONSTRAINT "BusinessDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessDayMeter" (
    "id" TEXT NOT NULL,
    "businessDayId" TEXT NOT NULL,
    "nozzleId" TEXT NOT NULL,
    "openingReading" DECIMAL(14,3) NOT NULL,
    "closingReading" DECIMAL(14,3),

    CONSTRAINT "BusinessDayMeter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessDayTank" (
    "id" TEXT NOT NULL,
    "businessDayId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "openingStock" DECIMAL(14,3) NOT NULL,
    "closingStock" DECIMAL(14,3),

    CONSTRAINT "BusinessDayTank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessDay_stationId_businessDate_key" ON "BusinessDay"("stationId", "businessDate");
CREATE INDEX "BusinessDay_stationId_status_idx" ON "BusinessDay"("stationId", "status");
CREATE UNIQUE INDEX "BusinessDayMeter_businessDayId_nozzleId_key" ON "BusinessDayMeter"("businessDayId", "nozzleId");
CREATE UNIQUE INDEX "BusinessDayTank_businessDayId_tankId_key" ON "BusinessDayTank"("businessDayId", "tankId");

-- AddForeignKey
ALTER TABLE "BusinessDay" ADD CONSTRAINT "BusinessDay_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessDayMeter" ADD CONSTRAINT "BusinessDayMeter_businessDayId_fkey" FOREIGN KEY ("businessDayId") REFERENCES "BusinessDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessDayMeter" ADD CONSTRAINT "BusinessDayMeter_nozzleId_fkey" FOREIGN KEY ("nozzleId") REFERENCES "Nozzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusinessDayTank" ADD CONSTRAINT "BusinessDayTank_businessDayId_fkey" FOREIGN KEY ("businessDayId") REFERENCES "BusinessDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessDayTank" ADD CONSTRAINT "BusinessDayTank_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
