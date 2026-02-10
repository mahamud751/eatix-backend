/*
  Warnings:

  - A unique constraint covering the columns `[srcHash]` on the table `File` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "File_srcHash_key" ON "File"("srcHash");
