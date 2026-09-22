-- Maps each Business 1:1 to a Clerk Organization (see ticket 03-negocio-como-organizacion).
-- Business is empty at this point: the prior migration's TRUNCATE of "User" CASCADE already emptied it.

-- AlterTable
ALTER TABLE "Business" ADD COLUMN "clerkOrgId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Business_clerkOrgId_key" ON "Business"("clerkOrgId");
