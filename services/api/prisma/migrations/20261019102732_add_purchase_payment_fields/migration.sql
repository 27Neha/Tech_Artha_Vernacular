-- AlterTable
ALTER TABLE "FpPurchaseOrder" ADD COLUMN     "fpOldId" INTEGER,
ADD COLUMN     "paymentId" INTEGER,
ADD COLUMN     "paymentTokenUrl" TEXT;

