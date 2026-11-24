-- AlterTable
ALTER TABLE "FpInvestorProfile" ADD COLUMN     "pepDetails" TEXT,
ADD COLUMN     "placeOfBirth" TEXT;

-- AlterTable
ALTER TABLE "FpMfInvestmentAccount" ADD COLUMN     "bankAccountOldId" INTEGER;

-- AlterTable
ALTER TABLE "TransactionChallenge" ADD COLUMN     "consentText" TEXT,
ADD COLUMN     "consentedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailBelongsTo" TEXT,
ADD COLUMN     "mobileBelongsTo" TEXT;
