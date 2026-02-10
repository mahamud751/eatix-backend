/*
  Warnings:

  - You are about to drop the column `advanceId` on the `File` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[src]` on the table `File` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_advanceId_fkey";

-- AlterTable
ALTER TABLE "File" DROP COLUMN "advanceId";

-- CreateTable
CREATE TABLE "_AdvanceDetails" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_AdvanceDetails_AB_unique" ON "_AdvanceDetails"("A", "B");

-- CreateIndex
CREATE INDEX "_AdvanceDetails_B_index" ON "_AdvanceDetails"("B");

-- CreateIndex
CREATE UNIQUE INDEX "File_src_key" ON "File"("src");

-- AddForeignKey
ALTER TABLE "_AdvanceDetails" ADD CONSTRAINT "_AdvanceDetails_A_fkey" FOREIGN KEY ("A") REFERENCES "Advance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdvanceDetails" ADD CONSTRAINT "_AdvanceDetails_B_fkey" FOREIGN KEY ("B") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
