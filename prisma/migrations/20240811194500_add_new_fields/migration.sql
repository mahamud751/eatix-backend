/*
  Warnings:

  - The `status` column on the `Advance` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Demo` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `advanceId` on the `File` table. All the data in the column will be lost.
  - You are about to drop the `Vendor` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Demo" DROP CONSTRAINT "Demo_advanceId_fkey";

-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_advanceId_fkey";

-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_demoId_fkey";

-- AlterTable
ALTER TABLE "Advance" ALTER COLUMN "quantity" SET DEFAULT 0,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Pending';

-- AlterTable
ALTER TABLE "Demo" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "advanceId" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Pending';

-- AlterTable
ALTER TABLE "File" DROP COLUMN "advanceId",
ALTER COLUMN "demoId" DROP NOT NULL;

-- DropTable
DROP TABLE "Vendor";

-- DropEnum
DROP TYPE "AdvanceStatus";

-- DropEnum
DROP TYPE "DemoStatus";

-- CreateTable
CREATE TABLE "_AdvanceDetails" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_AdvanceDemos" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_AdvanceDetails_AB_unique" ON "_AdvanceDetails"("A", "B");

-- CreateIndex
CREATE INDEX "_AdvanceDetails_B_index" ON "_AdvanceDetails"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AdvanceDemos_AB_unique" ON "_AdvanceDemos"("A", "B");

-- CreateIndex
CREATE INDEX "_AdvanceDemos_B_index" ON "_AdvanceDemos"("B");

-- AddForeignKey
ALTER TABLE "Demo" ADD CONSTRAINT "Demo_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "Advance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_demoId_fkey" FOREIGN KEY ("demoId") REFERENCES "Demo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdvanceDetails" ADD CONSTRAINT "_AdvanceDetails_A_fkey" FOREIGN KEY ("A") REFERENCES "Advance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdvanceDetails" ADD CONSTRAINT "_AdvanceDetails_B_fkey" FOREIGN KEY ("B") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdvanceDemos" ADD CONSTRAINT "_AdvanceDemos_A_fkey" FOREIGN KEY ("A") REFERENCES "Advance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdvanceDemos" ADD CONSTRAINT "_AdvanceDemos_B_fkey" FOREIGN KEY ("B") REFERENCES "Demo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
