/*
  Warnings:

  - A unique constraint covering the columns `[src]` on the table `File` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "File_src_key" ON "File"("src");
