/*
  Warnings:

  - You are about to drop the `_VendorAdvances` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_VendorAdvances" DROP CONSTRAINT "_VendorAdvances_A_fkey";

-- DropForeignKey
ALTER TABLE "_VendorAdvances" DROP CONSTRAINT "_VendorAdvances_B_fkey";

-- DropTable
DROP TABLE "_VendorAdvances";

-- CreateTable
CREATE TABLE "_AdvanceToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_AdvanceToUser_AB_unique" ON "_AdvanceToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_AdvanceToUser_B_index" ON "_AdvanceToUser"("B");

-- AddForeignKey
ALTER TABLE "_AdvanceToUser" ADD CONSTRAINT "_AdvanceToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Advance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdvanceToUser" ADD CONSTRAINT "_AdvanceToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
