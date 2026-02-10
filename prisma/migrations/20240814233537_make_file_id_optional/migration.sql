/*
  Warnings:

  - You are about to drop the `_AdvanceDetails` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_AdvanceDetails" DROP CONSTRAINT "_AdvanceDetails_A_fkey";

-- DropForeignKey
ALTER TABLE "_AdvanceDetails" DROP CONSTRAINT "_AdvanceDetails_B_fkey";

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "advanceId" TEXT;

-- DropTable
DROP TABLE "_AdvanceDetails";

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "Advance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
