-- Configurable payment accounts (F8) + richer Payment rows
CREATE TABLE "PaymentAccount" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "PaymentMethod" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentAccount_businessId_code_key" ON "PaymentAccount"("businessId", "code");
CREATE INDEX "PaymentAccount_businessId_idx" ON "PaymentAccount"("businessId");

ALTER TABLE "PaymentAccount" ADD CONSTRAINT "PaymentAccount_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment" ADD COLUMN "paymentAccountId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "saleId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "quantity" DECIMAL(14,3) NOT NULL DEFAULT 1;

CREATE INDEX "Payment_stationId_paidAt_idx" ON "Payment"("stationId", "paidAt");
CREATE INDEX "Payment_paymentAccountId_idx" ON "Payment"("paymentAccountId");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentAccountId_fkey" FOREIGN KEY ("paymentAccountId") REFERENCES "PaymentAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
