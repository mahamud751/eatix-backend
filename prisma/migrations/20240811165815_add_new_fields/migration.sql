-- CreateEnum
CREATE TYPE "AdvanceStatus" AS ENUM ('Pending', 'Processing', 'Approved', 'Canceled');

-- CreateEnum
CREATE TYPE "DemoStatus" AS ENUM ('Pending', 'Processing', 'Approved', 'Canceled');

-- CreateTable
CREATE TABLE "Advance" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "students" TEXT NOT NULL,
    "ratio" TEXT NOT NULL,
    "topPart" TEXT NOT NULL,
    "topFab" TEXT NOT NULL,
    "bottomPart" TEXT NOT NULL,
    "bottomFab" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 5,
    "status" "AdvanceStatus" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Demo" (
    "id" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "advanceId" TEXT NOT NULL,
    "status" "DemoStatus" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Demo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "advanceId" TEXT NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_DemoToFile" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_DemoToFile_AB_unique" ON "_DemoToFile"("A", "B");

-- CreateIndex
CREATE INDEX "_DemoToFile_B_index" ON "_DemoToFile"("B");

-- AddForeignKey
ALTER TABLE "Demo" ADD CONSTRAINT "Demo_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "Advance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "Advance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DemoToFile" ADD CONSTRAINT "_DemoToFile_A_fkey" FOREIGN KEY ("A") REFERENCES "Demo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DemoToFile" ADD CONSTRAINT "_DemoToFile_B_fkey" FOREIGN KEY ("B") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
