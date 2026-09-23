/*
  Warnings:

  - You are about to drop the column `cybrillaInvestorId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `cybrillaKycStatus` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "cybrillaInvestorId",
DROP COLUMN "cybrillaKycStatus";
