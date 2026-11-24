-- CreateTable PasswordResetOtp
CREATE TABLE IF NOT EXISTS "PasswordResetOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'PASSWORD_RESET',
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetOtp_pkey" PRIMARY KEY ("id")
);

-- AlterTable PasswordResetToken to explicitly separate authorization purpose
ALTER TABLE "PasswordResetToken" ADD COLUMN IF NOT EXISTS "purpose" TEXT NOT NULL DEFAULT 'PASSWORD_RESET';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordResetOtp_userId_purpose_status_createdAt_idx"
  ON "PasswordResetOtp"("userId", "purpose", "status", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PasswordResetOtp_email_purpose_status_createdAt_idx"
  ON "PasswordResetOtp"("email", "purpose", "status", "createdAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PasswordResetOtp_userId_fkey'
    ) THEN
        ALTER TABLE "PasswordResetOtp" ADD CONSTRAINT "PasswordResetOtp_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
