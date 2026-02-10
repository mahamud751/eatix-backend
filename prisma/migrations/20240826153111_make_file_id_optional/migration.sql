/*
  Warnings:

  - You are about to drop the column `chest` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `chestSize` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `shirtSize` on the `Student` table. All the data in the column will be lost.
  - Changed the type of `total` on the `Student` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `waistSize` on the `Student` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Student" DROP COLUMN "chest",
DROP COLUMN "chestSize",
DROP COLUMN "shirtSize",
DROP COLUMN "total",
ADD COLUMN     "total" DOUBLE PRECISION NOT NULL,
DROP COLUMN "waistSize",
ADD COLUMN     "waistSize" DOUBLE PRECISION NOT NULL;
