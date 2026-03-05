-- CreateEnum
CREATE TYPE "FeaturedStatus" AS ENUM ('active', 'expired', 'cancelled');

-- CreateTable
CREATE TABLE "FeaturedVideo" (
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
    "status" "FeaturedStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeaturedVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeaturedVideo_videoId_idx" ON "FeaturedVideo"("videoId");

-- CreateIndex
CREATE INDEX "FeaturedVideo_userId_idx" ON "FeaturedVideo"("userId");

-- CreateIndex
CREATE INDEX "FeaturedVideo_latitude_idx" ON "FeaturedVideo"("latitude");

-- CreateIndex
CREATE INDEX "FeaturedVideo_longitude_idx" ON "FeaturedVideo"("longitude");

-- CreateIndex
CREATE INDEX "FeaturedVideo_startDate_idx" ON "FeaturedVideo"("startDate");

-- CreateIndex
CREATE INDEX "FeaturedVideo_endDate_idx" ON "FeaturedVideo"("endDate");

-- CreateIndex
CREATE INDEX "FeaturedVideo_status_idx" ON "FeaturedVideo"("status");

-- AddForeignKey
ALTER TABLE "FeaturedVideo" ADD CONSTRAINT "FeaturedVideo_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedVideo" ADD CONSTRAINT "FeaturedVideo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
