/*
  Warnings:

  - A unique constraint covering the columns `[orderSerial]` on the table `SubOrder` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orderSerial` to the `SubOrder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SubOrder" ADD COLUMN     "orderSerial" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SubOrder_orderSerial_key" ON "SubOrder"("orderSerial");
