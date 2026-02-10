/*
  Warnings:

  - You are about to drop the `_AdvanceDemos` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_AdvanceDemos" DROP CONSTRAINT "_AdvanceDemos_A_fkey";

-- DropForeignKey
ALTER TABLE "_AdvanceDemos" DROP CONSTRAINT "_AdvanceDemos_B_fkey";

-- DropTable
DROP TABLE "_AdvanceDemos";
