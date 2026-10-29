-- CreateTable
CREATE TABLE "Nominee" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "allocationPercentage" INTEGER NOT NULL,
    "identityProofType" TEXT,
    "identityProofNumber" TEXT,
    "guardianName" TEXT,
    "guardianRelationship" TEXT,
    "fpSyncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "fpNomineeRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nominee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Nominee_userId_idx" ON "Nominee"("userId");

-- AddForeignKey
ALTER TABLE "Nominee" ADD CONSTRAINT "Nominee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

