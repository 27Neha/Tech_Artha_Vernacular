-- CreateTable
CREATE TABLE "TransactionChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransactionChallenge_userId_action_status_idx" ON "TransactionChallenge"("userId", "action", "status");

-- AddForeignKey
ALTER TABLE "TransactionChallenge" ADD CONSTRAINT "TransactionChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

