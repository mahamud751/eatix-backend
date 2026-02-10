/*
  Warnings:

  - You are about to drop the column `content` on the `Blog` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Blog` table. All the data in the column will be lost.
  - You are about to drop the `_BlogToBlogComment` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `desc` to the `Blog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Blog` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "_BlogToBlogComment" DROP CONSTRAINT "_BlogToBlogComment_A_fkey";

-- DropForeignKey
ALTER TABLE "_BlogToBlogComment" DROP CONSTRAINT "_BlogToBlogComment_B_fkey";

-- AlterTable
ALTER TABLE "Blog" DROP COLUMN "content",
DROP COLUMN "title",
ADD COLUMN     "desc" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "photos" TEXT[];

-- DropTable
DROP TABLE "_BlogToBlogComment";
