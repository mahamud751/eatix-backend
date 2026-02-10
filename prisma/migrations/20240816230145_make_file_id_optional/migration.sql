-- AlterTable
ALTER TABLE "School" ADD COLUMN     "managerId" TEXT;

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
