/*
  Warnings:

  - Added the required column `code` to the `Discount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `details` to the `Discount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `percentenge` to the `Discount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "details" TEXT NOT NULL,
ADD COLUMN     "percentenge" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "PriceSetting" (
    "id" TEXT NOT NULL,
    "base" TEXT NOT NULL,
    "photos" JSONB[],
    "currency" TEXT NOT NULL,
    "currecyRate" TEXT NOT NULL,
    "currecyRateInc" TEXT NOT NULL,
    "addintional" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "PriceSetting_pkey" PRIMARY KEY ("id")
);
