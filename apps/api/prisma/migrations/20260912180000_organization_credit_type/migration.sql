-- Feature 6: company credit type (daily / monthly / both)
CREATE TYPE "CreditType" AS ENUM ('DAILY', 'MONTHLY', 'BOTH');

ALTER TABLE "Organization"
ADD COLUMN "creditType" "CreditType" NOT NULL DEFAULT 'BOTH';
