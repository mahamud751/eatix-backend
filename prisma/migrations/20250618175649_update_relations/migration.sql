/*
  Warnings:

  - Added the required column `type` to the `Shipping` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ShippingType" AS ENUM ('shipping', 'air', 'sea');

-- AlterTable
ALTER TABLE "Shipping" ADD COLUMN     "type" "ShippingType" NOT NULL;
