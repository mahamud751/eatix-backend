/*
  Warnings:

  - Added the required column `b2bPrice` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "b2bPrice" TEXT NOT NULL;
