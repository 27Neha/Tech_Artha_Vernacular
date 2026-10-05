-- CreateTable
CREATE TABLE "CustomBucket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My Custom Bucket',
    "funds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomBucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomBucket_userId_idx" ON "CustomBucket"("userId");

-- AddForeignKey
ALTER TABLE "CustomBucket" ADD CONSTRAINT "CustomBucket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
