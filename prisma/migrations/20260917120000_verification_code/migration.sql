-- DropIndex
DROP INDEX "User_verificationTokenHash_key";

-- DropIndex
DROP INDEX "Employee_verificationTokenHash_key";

-- RenameColumn
ALTER TABLE "User" RENAME COLUMN "verificationTokenHash" TO "verificationCodeHash";
ALTER TABLE "User" RENAME COLUMN "verificationTokenExpiresAt" TO "verificationCodeExpiresAt";

-- RenameColumn
ALTER TABLE "Employee" RENAME COLUMN "verificationTokenHash" TO "verificationCodeHash";
ALTER TABLE "Employee" RENAME COLUMN "verificationTokenExpiresAt" TO "verificationCodeExpiresAt";
