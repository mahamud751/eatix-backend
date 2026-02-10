/*
  Warnings:

  - You are about to drop the `DyanamicPage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "DyanamicPage";

-- CreateTable
CREATE TABLE "Dyanamic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dyanamic_pkey" PRIMARY KEY ("id")
);
