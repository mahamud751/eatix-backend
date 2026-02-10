/*
  Warnings:

  - You are about to drop the column `apartment` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `b2b` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `bkashTrx` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `nagadNumber` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `rocketNumber` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "apartment",
DROP COLUMN "b2b",
DROP COLUMN "bkashTrx",
DROP COLUMN "nagadNumber",
DROP COLUMN "rocketNumber";
