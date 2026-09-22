-- Retires the backend's own credential store for User in favor of Clerk (see ticket 01-duenio-clerk-login).
-- Existing Users have no Clerk identity to backfill: this assumes the table is cleared before applying,
-- which also drops every row that references a User (Business, Branch, Service, Employee, Booking) via CASCADE.

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropTable
DROP TABLE "Session";

TRUNCATE TABLE "User" CASCADE;

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "User"
  DROP COLUMN "passwordHash",
  DROP COLUMN "pendingEmail",
  DROP COLUMN "emailVerifiedAt",
  DROP COLUMN "verificationCodeHash",
  DROP COLUMN "verificationCodeExpiresAt",
  ADD COLUMN "clerkId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");
