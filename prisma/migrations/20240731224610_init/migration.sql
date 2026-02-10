-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "SubCategory" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';
