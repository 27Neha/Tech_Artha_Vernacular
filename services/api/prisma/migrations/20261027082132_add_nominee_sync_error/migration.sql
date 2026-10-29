-- AlterTable
ALTER TABLE "Nominee" ADD COLUMN     "fpSyncError" TEXT;

-- Nominations were held as NOT_SUPPORTED while the gateway shape was unknown. They are
-- now registered through related_parties, so they are pending registration instead.
UPDATE "Nominee" SET "fpSyncStatus" = 'PENDING' WHERE "fpSyncStatus" = 'NOT_SUPPORTED';
