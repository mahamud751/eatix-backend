/*
  Warnings:

  - You are about to drop the column `photos` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `subCategoryId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `photos` on the `SubCategory` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `SubCategory` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `price` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Made the column `categoryId` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_subCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_branchId_fkey";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "photos",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "subCategoryId",
ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "colors" TEXT[],
ADD COLUMN     "desc" TEXT,
ADD COLUMN     "discountPrice" TEXT,
ADD COLUMN     "discountType" TEXT NOT NULL DEFAULT 'no',
ADD COLUMN     "flashsale" TEXT NOT NULL DEFAULT 'no',
ADD COLUMN     "fulldesc" TEXT,
ADD COLUMN     "latest" TEXT NOT NULL DEFAULT 'no',
ADD COLUMN     "photos" TEXT[],
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "reviewId" TEXT,
ADD COLUMN     "sizes" TEXT[],
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Active',
ADD COLUMN     "stock" TEXT NOT NULL DEFAULT 'yes',
ADD COLUMN     "subcategoryId" TEXT,
ADD COLUMN     "userInfo" JSONB,
ADD COLUMN     "views" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "categoryId" SET NOT NULL;

-- AlterTable
ALTER TABLE "SubCategory" DROP COLUMN "photos",
DROP COLUMN "updatedAt";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CategoryProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_SubCategoryProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CategoryProducts_AB_unique" ON "_CategoryProducts"("A", "B");

-- CreateIndex
CREATE INDEX "_CategoryProducts_B_index" ON "_CategoryProducts"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_SubCategoryProducts_AB_unique" ON "_SubCategoryProducts"("A", "B");

-- CreateIndex
CREATE INDEX "_SubCategoryProducts_B_index" ON "_SubCategoryProducts"("B");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "SubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryProducts" ADD CONSTRAINT "_CategoryProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryProducts" ADD CONSTRAINT "_CategoryProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubCategoryProducts" ADD CONSTRAINT "_SubCategoryProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubCategoryProducts" ADD CONSTRAINT "_SubCategoryProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "SubCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
