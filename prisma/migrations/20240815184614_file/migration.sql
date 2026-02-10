/*
  Warnings:

  - A unique constraint covering the columns `[srcHash]` on the table `File` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `srcHash` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "File_src_key";

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "srcHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "File_srcHash_key" ON "File"("srcHash");
