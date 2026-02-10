/*
  Warnings:

  - The `photos` column on the `Banner` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `photos` column on the `Blog` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `fileType` on the `File` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `File` table. All the data in the column will be lost.
  - Added the required column `src` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Banner" DROP COLUMN "photos",
ADD COLUMN     "photos" JSONB[];

-- AlterTable
ALTER TABLE "Blog" DROP COLUMN "photos",
ADD COLUMN     "photos" JSONB[];

-- AlterTable
ALTER TABLE "File" DROP COLUMN "fileType",
DROP COLUMN "url",
ADD COLUMN     "src" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL;
