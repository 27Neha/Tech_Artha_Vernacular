-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cybrillaInvestorId" TEXT,
ADD COLUMN     "cybrillaKycStatus" TEXT;

-- CreateTable
CREATE TABLE "FpInvestorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fpProfileId" TEXT,
    "name" TEXT NOT NULL,
    "pan" TEXT NOT NULL,
    "dateOfBirth" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "taxStatus" TEXT NOT NULL DEFAULT 'resident_individual',
    "occupation" TEXT NOT NULL,
    "incomeSlab" TEXT NOT NULL,
    "sourceOfWealth" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FpInvestorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FpMfInvestmentAccount" (
    "id" TEXT NOT NULL,
    "fpAccountId" TEXT NOT NULL,
    "investorProfileId" TEXT NOT NULL,
    "holdingPattern" TEXT NOT NULL DEFAULT 'single',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FpMfInvestmentAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FpPurchaseOrder" (
    "id" TEXT NOT NULL,
    "fpOrderId" TEXT,
    "accountId" TEXT NOT NULL,
    "schemeIsin" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "folioNumber" TEXT,
    "allottedUnits" DOUBLE PRECISION,
    "purchasedPrice" DOUBLE PRECISION,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FpPurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FpPurchasePlan" (
    "id" TEXT NOT NULL,
    "fpPlanId" TEXT,
    "accountId" TEXT NOT NULL,
    "schemeIsin" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
    "installmentDay" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "mandateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FpPurchasePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FpMandate" (
    "id" TEXT NOT NULL,
    "fpMandateId" TEXT,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'UPI_AUTOPAY',
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "maxAmount" DOUBLE PRECISION NOT NULL,
    "bankAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FpMandate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FpInvestorProfile_userId_key" ON "FpInvestorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FpInvestorProfile_fpProfileId_key" ON "FpInvestorProfile"("fpProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "FpMfInvestmentAccount_fpAccountId_key" ON "FpMfInvestmentAccount"("fpAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "FpPurchaseOrder_fpOrderId_key" ON "FpPurchaseOrder"("fpOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "FpPurchasePlan_fpPlanId_key" ON "FpPurchasePlan"("fpPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "FpMandate_fpMandateId_key" ON "FpMandate"("fpMandateId");

-- AddForeignKey
ALTER TABLE "FpInvestorProfile" ADD CONSTRAINT "FpInvestorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpMfInvestmentAccount" ADD CONSTRAINT "FpMfInvestmentAccount_investorProfileId_fkey" FOREIGN KEY ("investorProfileId") REFERENCES "FpInvestorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpPurchaseOrder" ADD CONSTRAINT "FpPurchaseOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FpMfInvestmentAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpPurchasePlan" ADD CONSTRAINT "FpPurchasePlan_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FpMfInvestmentAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FpMandate" ADD CONSTRAINT "FpMandate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
