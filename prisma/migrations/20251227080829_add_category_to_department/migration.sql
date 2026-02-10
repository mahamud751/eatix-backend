-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "categoryId" TEXT;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CompanyCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
