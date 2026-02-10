/*
  Warnings:

  - The `status` column on the `School` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "School" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- DropEnum
DROP TYPE "SchoolStatus";
