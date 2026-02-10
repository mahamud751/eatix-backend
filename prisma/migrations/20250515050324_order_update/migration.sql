/*
  Warnings:

  - Made the column `isDeleted` on table `Order` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "isDeleted" SET NOT NULL,
ALTER COLUMN "isDeleted" SET DEFAULT false;
