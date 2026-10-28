-- The earlier FpMandate table was never written to (no code used it). It is reshaped to
-- belong to the investment account whose bank account the mandate debits. Adding NOT NULL
-- columns assumes it is empty, as it is wherever this app has run.

-- DropForeignKey
ALTER TABLE "FpMandate" DROP CONSTRAINT "FpMandate_userId_fkey";

-- AlterTable
ALTER TABLE "FpMandate" DROP COLUMN "bankAccountId",
DROP COLUMN "maxAmount",
DROP COLUMN "type",
DROP COLUMN "userId",
ADD COLUMN     "accountId" TEXT NOT NULL,
ADD COLUMN     "authorizationUrl" TEXT,
ADD COLUMN     "mandateLimit" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "mandateType" TEXT NOT NULL,
ADD COLUMN     "umrn" TEXT,
DROP COLUMN "fpMandateId",
ADD COLUMN     "fpMandateId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "FpMandate_fpMandateId_key" ON "FpMandate"("fpMandateId");

-- CreateIndex
CREATE INDEX "FpMandate_accountId_idx" ON "FpMandate"("accountId");

-- AddForeignKey
ALTER TABLE "FpMandate" ADD CONSTRAINT "FpMandate_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FpMfInvestmentAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

