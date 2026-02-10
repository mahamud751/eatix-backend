-- DropIndex
DROP INDEX "File_srcHash_key";

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "advanceId" TEXT,
ALTER COLUMN "srcHash" DROP NOT NULL;
