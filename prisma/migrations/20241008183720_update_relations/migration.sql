/*
  Warnings:

  - You are about to drop the column `content` on the `Review` table. All the data in the column will be lost.
  - Added the required column `comment` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `productId` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userName` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_reviewId_fkey";

-- AlterTable
ALTER TABLE "Review" DROP COLUMN "content",
ADD COLUMN     "category" TEXT,
ADD COLUMN     "comment" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "photos" JSONB[],
ADD COLUMN     "productId" TEXT NOT NULL,
ADD COLUMN     "rating" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "replies" JSONB,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userName" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
