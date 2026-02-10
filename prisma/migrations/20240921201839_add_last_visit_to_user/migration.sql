/*
  Warnings:

  - You are about to drop the `_LastVisitedProducts` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_LastVisitedProducts" DROP CONSTRAINT "_LastVisitedProducts_A_fkey";

-- DropForeignKey
ALTER TABLE "_LastVisitedProducts" DROP CONSTRAINT "_LastVisitedProducts_B_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastVisited" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DropTable
DROP TABLE "_LastVisitedProducts";
