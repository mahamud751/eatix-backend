-- CreateEnum
CREATE TYPE "SponsoredStatus" AS ENUM ('active', 'expired', 'cancelled');

-- CreateTable
CREATE TABLE "SponsoredVideo" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "areaName" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusKm" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "status" "SponsoredStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsoredVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SponsoredVideo_videoId_idx" ON "SponsoredVideo"("videoId");

-- CreateIndex
CREATE INDEX "SponsoredVideo_userId_idx" ON "SponsoredVideo"("userId");

-- CreateIndex
CREATE INDEX "SponsoredVideo_latitude_idx" ON "SponsoredVideo"("latitude");

-- CreateIndex
CREATE INDEX "SponsoredVideo_longitude_idx" ON "SponsoredVideo"("longitude");

-- CreateIndex
CREATE INDEX "SponsoredVideo_startDate_idx" ON "SponsoredVideo"("startDate");

-- CreateIndex
CREATE INDEX "SponsoredVideo_endDate_idx" ON "SponsoredVideo"("endDate");

-- CreateIndex
CREATE INDEX "SponsoredVideo_status_idx" ON "SponsoredVideo"("status");

-- AddForeignKey
ALTER TABLE "SponsoredVideo" ADD CONSTRAINT "SponsoredVideo_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsoredVideo" ADD CONSTRAINT "SponsoredVideo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
