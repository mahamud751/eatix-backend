/*
  Warnings:

  - You are about to drop the `Dyanamic` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Dyanamic";

-- CreateTable
CREATE TABLE "Dynamic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dynamic_pkey" PRIMARY KEY ("id")
);
