/*
  Warnings:

  - You are about to drop the column `vendorId` on the `Advance` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Advance" DROP CONSTRAINT "Advance_vendorId_fkey";

-- AlterTable
ALTER TABLE "Advance" DROP COLUMN "vendorId",
ADD COLUMN     "vendorIds" TEXT;

-- CreateTable
CREATE TABLE "_VendorAdvances" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_VendorAdvances_AB_unique" ON "_VendorAdvances"("A", "B");

-- CreateIndex
CREATE INDEX "_VendorAdvances_B_index" ON "_VendorAdvances"("B");

-- AddForeignKey
ALTER TABLE "_VendorAdvances" ADD CONSTRAINT "_VendorAdvances_A_fkey" FOREIGN KEY ("A") REFERENCES "Advance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VendorAdvances" ADD CONSTRAINT "_VendorAdvances_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
