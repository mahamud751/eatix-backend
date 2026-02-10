/*
  Warnings:

  - You are about to drop the column `bookingExtend` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `dutchNumber` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `dutchTrx` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `rocketTrx` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `transactionId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `unReceivedTk` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `userCancel` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "bookingExtend",
DROP COLUMN "dutchNumber",
DROP COLUMN "dutchTrx",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "rocketTrx",
DROP COLUMN "transactionId",
DROP COLUMN "unReceivedTk",
DROP COLUMN "userCancel",
ADD COLUMN     "name" TEXT;
