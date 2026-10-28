-- AlterTable
ALTER TABLE "KYCApplication" ADD COLUMN     "readinessCode" TEXT,
ADD COLUMN     "readinessStatus" TEXT NOT NULL DEFAULT 'PENDING';
