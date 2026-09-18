-- Feature 10: salary / rent advances (monthly obligations + payments)
CREATE TYPE "ObligationKind" AS ENUM ('RENT', 'SALARY');

CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "defaultMonthlySalary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Employee_businessId_name_key" ON "Employee"("businessId", "name");
CREATE INDEX "Employee_businessId_idx" ON "Employee"("businessId");

ALTER TABLE "Employee" ADD CONSTRAINT "Employee_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MonthlyObligation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "stationId" TEXT,
    "kind" "ObligationKind" NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "employeeId" TEXT,
    "yearMonth" TEXT NOT NULL,
    "monthlyAmount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyObligation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MonthlyObligation_businessId_kind_scopeKey_yearMonth_key" ON "MonthlyObligation"("businessId", "kind", "scopeKey", "yearMonth");
CREATE INDEX "MonthlyObligation_businessId_yearMonth_idx" ON "MonthlyObligation"("businessId", "yearMonth");
CREATE INDEX "MonthlyObligation_employeeId_idx" ON "MonthlyObligation"("employeeId");

ALTER TABLE "MonthlyObligation" ADD CONSTRAINT "MonthlyObligation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MonthlyObligation" ADD CONSTRAINT "MonthlyObligation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ObligationPayment" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObligationPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ObligationPayment_obligationId_paidAt_idx" ON "ObligationPayment"("obligationId", "paidAt");

ALTER TABLE "ObligationPayment" ADD CONSTRAINT "ObligationPayment_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "MonthlyObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
