/*
  Warnings:

  - You are about to drop the column `userStatus` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "userStatus",
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'active';
