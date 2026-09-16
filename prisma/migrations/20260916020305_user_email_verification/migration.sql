-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pendingEmail" TEXT,
ADD COLUMN     "emailVerifiedAt" TIMESTAMPTZ(3),
ADD COLUMN     "verificationTokenHash" TEXT,
ADD COLUMN     "verificationTokenExpiresAt" TIMESTAMPTZ(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_verificationTokenHash_key" ON "User"("verificationTokenHash");
