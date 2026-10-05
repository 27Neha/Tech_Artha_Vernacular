-- AlterTable
ALTER TABLE "Guardian" ADD COLUMN     "address" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "documentId" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "isMobileVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pan" TEXT;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "majorityDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GuardianConsent" (
    "id" TEXT NOT NULL,
    "minorUserId" TEXT NOT NULL,
    "guardianId" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "consentTextHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "ipAddress" TEXT,
    "verificationMethod" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinorRiskAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentType" TEXT NOT NULL DEFAULT 'MINOR_INVESTOR_PROFILE',
    "version" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "profileType" TEXT NOT NULL,
    "riskCategory" TEXT,
    "goal" TEXT,
    "timeHorizon" TEXT,
    "knowledgeLevel" TEXT,
    "riskComfort" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinorRiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinorInvestorProfileResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "assessmentVersion" TEXT NOT NULL DEFAULT 'minor-v1',
    "riskToleranceScore" INTEGER NOT NULL,
    "timeHorizonScore" INTEGER NOT NULL,
    "knowledgeScore" INTEGER NOT NULL,
    "financialHabitScore" INTEGER NOT NULL,
    "goalType" TEXT NOT NULL,
    "profileType" TEXT NOT NULL,
    "profileTitle" TEXT NOT NULL,
    "profileTagline" TEXT NOT NULL,
    "profileConsistency" TEXT NOT NULL,
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "focusAreas" JSONB NOT NULL DEFAULT '[]',
    "nextSteps" JSONB NOT NULL DEFAULT '[]',
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MinorInvestorProfileResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MinorInvestorProfileResult_userId_key" ON "MinorInvestorProfileResult"("userId");

-- AddForeignKey
ALTER TABLE "GuardianConsent" ADD CONSTRAINT "GuardianConsent_minorUserId_fkey" FOREIGN KEY ("minorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinorRiskAssessment" ADD CONSTRAINT "MinorRiskAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinorInvestorProfileResult" ADD CONSTRAINT "MinorInvestorProfileResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
