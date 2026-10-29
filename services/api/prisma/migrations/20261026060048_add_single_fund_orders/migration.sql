-- AlterTable
ALTER TABLE "FpPurchaseOrder" ADD COLUMN     "fundName" TEXT;

-- AlterTable
ALTER TABLE "FpPurchasePlan" ADD COLUMN     "fundName" TEXT,
ALTER COLUMN "bucketId" DROP NOT NULL;
