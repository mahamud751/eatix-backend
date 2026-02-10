/*
  Warnings:

  - You are about to drop the column `type` on the `Shipping` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Shipping" DROP COLUMN "type";

-- DropEnum
DROP TYPE "ShippingType";
