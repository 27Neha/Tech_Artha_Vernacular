/*
  Warnings:

  - Added the required column `bucketId` to the `FpPurchasePlan` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FpMfInvestmentAccount" ADD COLUMN     "bankAccountId" TEXT;

-- AlterTable
ALTER TABLE "FpPurchasePlan" ADD COLUMN     "bucketId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "pan" TEXT;
