/*
  Warnings:

  - You are about to drop the column `selectedColor` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `selectedSize` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "selectedColor",
DROP COLUMN "selectedSize";
