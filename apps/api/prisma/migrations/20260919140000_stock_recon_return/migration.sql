-- Feature 12: paper-form Return column on daily tank stock recon
ALTER TABLE "BusinessDayTank" ADD COLUMN "returnLitres" DECIMAL(14,3) NOT NULL DEFAULT 0;
