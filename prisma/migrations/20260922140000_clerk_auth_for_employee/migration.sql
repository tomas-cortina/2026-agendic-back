-- Gives Employee its own Clerk identity, invited via Organization invitation instead of a code
-- (see ticket 04-empleado-clerk-login). Employee is empty at this point: the migration truncating
-- "User" CASCADE already emptied it.

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "clerkId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_clerkId_key" ON "Employee"("clerkId");
