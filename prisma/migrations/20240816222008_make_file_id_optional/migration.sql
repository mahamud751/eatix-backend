-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('pending', 'processing', 'delivery', 'canceled');

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photos" JSONB[],
    "email" TEXT,
    "password" TEXT,
    "location" TEXT,
    "status" "SchoolStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "total" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "chest" TEXT NOT NULL,
    "chestSize" TEXT NOT NULL,
    "shirtSize" TEXT NOT NULL,
    "shoulder" DOUBLE PRECISION NOT NULL,
    "sleeveLength" DOUBLE PRECISION NOT NULL,
    "collar" DOUBLE PRECISION NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "armhole" DOUBLE PRECISION NOT NULL,
    "sleeveOpening" DOUBLE PRECISION NOT NULL,
    "waist" DOUBLE PRECISION NOT NULL,
    "waistSize" TEXT NOT NULL,
    "halfBody" DOUBLE PRECISION,
    "bottomHem" DOUBLE PRECISION,
    "hips" DOUBLE PRECISION,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
