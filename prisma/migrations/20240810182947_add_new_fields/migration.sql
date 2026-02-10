/*
  Warnings:

  - You are about to drop the column `desc` on the `Blog` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Blog` table. All the data in the column will be lost.
  - You are about to drop the column `photos` on the `Blog` table. All the data in the column will be lost.
  - Added the required column `content` to the `Blog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Blog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Blog" DROP COLUMN "desc",
DROP COLUMN "name",
DROP COLUMN "photos",
ADD COLUMN     "content" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "_BlogToBlogComment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_BlogToBlogComment_AB_unique" ON "_BlogToBlogComment"("A", "B");

-- CreateIndex
CREATE INDEX "_BlogToBlogComment_B_index" ON "_BlogToBlogComment"("B");

-- AddForeignKey
ALTER TABLE "_BlogToBlogComment" ADD CONSTRAINT "_BlogToBlogComment_A_fkey" FOREIGN KEY ("A") REFERENCES "Blog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BlogToBlogComment" ADD CONSTRAINT "_BlogToBlogComment_B_fkey" FOREIGN KEY ("B") REFERENCES "BlogComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
