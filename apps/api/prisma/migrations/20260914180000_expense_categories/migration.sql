-- Configurable expense categories (F9) + richer Expense rows (Concept B)
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExpenseCategory_businessId_code_key" ON "ExpenseCategory"("businessId", "code");
CREATE INDEX "ExpenseCategory_businessId_idx" ON "ExpenseCategory"("businessId");

ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Expense" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "name" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Expense" ADD COLUMN "attachmentUrl" TEXT;
ALTER TABLE "Expense" ADD COLUMN "paidFromTodaysCash" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");
CREATE INDEX "Expense_stationId_paidFromTodaysCash_spentAt_idx" ON "Expense"("stationId", "paidFromTodaysCash", "spentAt");

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
