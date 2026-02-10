/*
  Warnings:

  - You are about to drop the column `flashsale` on the `Discount` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Discount" DROP COLUMN "flashsale";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "b2b" TEXT NOT NULL DEFAULT 'no';
