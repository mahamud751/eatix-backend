/*
  Warnings:

  - The `vendorIds` column on the `Advance` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Advance" DROP COLUMN "vendorIds",
ADD COLUMN     "vendorIds" TEXT[];
