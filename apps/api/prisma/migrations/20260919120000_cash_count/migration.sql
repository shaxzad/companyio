-- Feature 11: cash denomination count per station business day
CREATE TABLE "CashCount" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "businessDate" DATE NOT NULL,
    "totalCash" DECIMAL(14,2) NOT NULL,
    "countedBy" TEXT NOT NULL,
    "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashCount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CashCount_stationId_businessDate_key" ON "CashCount"("stationId", "businessDate");
CREATE INDEX "CashCount_stationId_businessDate_idx" ON "CashCount"("stationId", "businessDate");

ALTER TABLE "CashCount" ADD CONSTRAINT "CashCount_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CashCountLine" (
    "id" TEXT NOT NULL,
    "cashCountId" TEXT NOT NULL,
    "denominationId" TEXT,
    "faceValue" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "CashCountLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CashCountLine_cashCountId_idx" ON "CashCountLine"("cashCountId");
CREATE INDEX "CashCountLine_denominationId_idx" ON "CashCountLine"("denominationId");

ALTER TABLE "CashCountLine" ADD CONSTRAINT "CashCountLine_cashCountId_fkey" FOREIGN KEY ("cashCountId") REFERENCES "CashCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashCountLine" ADD CONSTRAINT "CashCountLine_denominationId_fkey" FOREIGN KEY ("denominationId") REFERENCES "CashDenomination"("id") ON DELETE SET NULL ON UPDATE CASCADE;
