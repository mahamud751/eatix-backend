/*
  Warnings:

  - You are about to drop the column `sideBanner` on the `Banner` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Banner" DROP COLUMN "sideBanner",
ADD COLUMN     "sideBanners" JSONB[];
