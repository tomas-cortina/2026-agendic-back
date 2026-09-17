-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "verificationTokenHash" TEXT,
ADD COLUMN     "verificationTokenExpiresAt" TIMESTAMPTZ(3);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_verificationTokenHash_key" ON "Employee"("verificationTokenHash");
