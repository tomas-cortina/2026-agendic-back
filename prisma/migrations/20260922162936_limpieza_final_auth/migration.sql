/*
  Warnings:

  - You are about to drop the column `emailVerifiedAt` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `verificationCodeExpiresAt` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `verificationCodeHash` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "emailVerifiedAt",
DROP COLUMN "verificationCodeExpiresAt",
DROP COLUMN "verificationCodeHash";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role";

-- DropEnum
DROP TYPE "Role";
