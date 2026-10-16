-- CreateTable
CREATE TABLE "FpRedemptionOrder" (
    "id" TEXT NOT NULL,
    "fpRedemptionId" TEXT,
    "accountId" TEXT NOT NULL,
    "schemeIsin" TEXT NOT NULL,
    "folioNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "units" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isFullExit" BOOLEAN NOT NULL DEFAULT false,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FpRedemptionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FpRedemptionOrder_fpRedemptionId_key" ON "FpRedemptionOrder"("fpRedemptionId");

-- CreateIndex
CREATE INDEX "FpRedemptionOrder_accountId_idx" ON "FpRedemptionOrder"("accountId");

-- AddForeignKey
ALTER TABLE "FpRedemptionOrder" ADD CONSTRAINT "FpRedemptionOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FpMfInvestmentAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

