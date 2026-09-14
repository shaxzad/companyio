-- Feature 7: credit invoice fields + company opening balance
ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "openingBalance" DECIMAL(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE "Sale"
ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT,
ADD COLUMN IF NOT EXISTS "driverName" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Sale_invoiceNumber_key" ON "Sale"("invoiceNumber");
