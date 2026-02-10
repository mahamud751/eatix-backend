-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT,
    "clientName" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "taskTitle" TEXT NOT NULL,
    "description" TEXT,
    "attachments" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "status" "ProjectStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "industry" TEXT,
    "taskTitle" TEXT NOT NULL,
    "description" TEXT,
    "attachments" JSONB[] DEFAULT ARRAY[]::JSONB[],
    "status" "BusinessStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Project_businessId_idx" ON "Project"("businessId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Business_userId_idx" ON "Business"("userId");

-- CreateIndex
CREATE INDEX "Business_status_idx" ON "Business"("status");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
