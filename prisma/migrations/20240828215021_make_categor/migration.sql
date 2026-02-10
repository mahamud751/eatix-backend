/*
  Warnings:

  - You are about to drop the `_AdvanceToUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_AdvanceToUser" DROP CONSTRAINT "_AdvanceToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_AdvanceToUser" DROP CONSTRAINT "_AdvanceToUser_B_fkey";

-- DropTable
DROP TABLE "_AdvanceToUser";

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
