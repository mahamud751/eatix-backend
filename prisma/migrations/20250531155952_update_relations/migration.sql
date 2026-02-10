-- CreateTable
CREATE TABLE "BusinessBanner" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "banners" JSONB[],

    CONSTRAINT "BusinessBanner_pkey" PRIMARY KEY ("id")
);
