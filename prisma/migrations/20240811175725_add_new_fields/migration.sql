/*
  Warnings:

  - The values [Pending,Processing,Approved,Canceled] on the enum `AdvanceStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [Pending,Processing,Approved,Canceled] on the enum `DemoStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `_DemoToFile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_UserVendors` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `demoId` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AdvanceStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'APPROVED', 'CANCELED');
ALTER TABLE "Advance" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Advance" ALTER COLUMN "status" TYPE "AdvanceStatus_new" USING ("status"::text::"AdvanceStatus_new");
ALTER TYPE "AdvanceStatus" RENAME TO "AdvanceStatus_old";
ALTER TYPE "AdvanceStatus_new" RENAME TO "AdvanceStatus";
DROP TYPE "AdvanceStatus_old";
ALTER TABLE "Advance" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "DemoStatus_new" AS ENUM ('PENDING', 'PROCESSING', 'APPROVED', 'CANCELED');
ALTER TABLE "Demo" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Demo" ALTER COLUMN "status" TYPE "DemoStatus_new" USING ("status"::text::"DemoStatus_new");
ALTER TYPE "DemoStatus" RENAME TO "DemoStatus_old";
ALTER TYPE "DemoStatus_new" RENAME TO "DemoStatus";
DROP TYPE "DemoStatus_old";
ALTER TABLE "Demo" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "_DemoToFile" DROP CONSTRAINT "_DemoToFile_A_fkey";

-- DropForeignKey
ALTER TABLE "_DemoToFile" DROP CONSTRAINT "_DemoToFile_B_fkey";

-- DropForeignKey
ALTER TABLE "_UserVendors" DROP CONSTRAINT "_UserVendors_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserVendors" DROP CONSTRAINT "_UserVendors_B_fkey";

-- AlterTable
ALTER TABLE "Advance" ALTER COLUMN "quantity" DROP DEFAULT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Demo" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "demoId" TEXT NOT NULL;

-- DropTable
DROP TABLE "_DemoToFile";

-- DropTable
DROP TABLE "_UserVendors";

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
ALTER TABLE "File" ADD CONSTRAINT "File_demoId_fkey" FOREIGN KEY ("demoId") REFERENCES "Demo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VendorAdvances" ADD CONSTRAINT "_VendorAdvances_A_fkey" FOREIGN KEY ("A") REFERENCES "Advance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VendorAdvances" ADD CONSTRAINT "_VendorAdvances_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
