/*
  Warnings:

  - The `photos` column on the `Category` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `photos` column on the `Product` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `photos` column on the `SubCategory` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Category" DROP COLUMN "photos",
ADD COLUMN     "photos" JSONB[];

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "photos",
ADD COLUMN     "photos" JSONB[];

-- AlterTable
ALTER TABLE "SubCategory" DROP COLUMN "photos",
ADD COLUMN     "photos" JSONB[];
