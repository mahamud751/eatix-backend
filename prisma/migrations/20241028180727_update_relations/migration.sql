/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Discount` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Discount_name_key" ON "Discount"("name");
