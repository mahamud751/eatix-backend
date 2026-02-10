/*
  Warnings:

  - You are about to drop the column `photos` on the `Banner` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Banner" DROP COLUMN "photos",
ADD COLUMN     "banners" JSONB[];
