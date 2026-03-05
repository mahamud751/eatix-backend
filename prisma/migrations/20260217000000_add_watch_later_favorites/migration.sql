-- CreateTable
CREATE TABLE "VideoWatchLater" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoWatchLater_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoFavorite" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortWatchLater" (
    "id" TEXT NOT NULL,
    "shortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortWatchLater_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortFavorite" (
    "id" TEXT NOT NULL,
    "shortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoWatchLater_videoId_userId_key" ON "VideoWatchLater"("videoId", "userId");

-- CreateIndex
CREATE INDEX "VideoWatchLater_videoId_idx" ON "VideoWatchLater"("videoId");

-- CreateIndex
CREATE INDEX "VideoWatchLater_userId_idx" ON "VideoWatchLater"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoFavorite_videoId_userId_key" ON "VideoFavorite"("videoId", "userId");

-- CreateIndex
CREATE INDEX "VideoFavorite_videoId_idx" ON "VideoFavorite"("videoId");

-- CreateIndex
CREATE INDEX "VideoFavorite_userId_idx" ON "VideoFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortWatchLater_shortId_userId_key" ON "ShortWatchLater"("shortId", "userId");

-- CreateIndex
CREATE INDEX "ShortWatchLater_shortId_idx" ON "ShortWatchLater"("shortId");

-- CreateIndex
CREATE INDEX "ShortWatchLater_userId_idx" ON "ShortWatchLater"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortFavorite_shortId_userId_key" ON "ShortFavorite"("shortId", "userId");

-- CreateIndex
CREATE INDEX "ShortFavorite_shortId_idx" ON "ShortFavorite"("shortId");

-- CreateIndex
CREATE INDEX "ShortFavorite_userId_idx" ON "ShortFavorite"("userId");

-- AddForeignKey
ALTER TABLE "VideoWatchLater" ADD CONSTRAINT "VideoWatchLater_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoWatchLater" ADD CONSTRAINT "VideoWatchLater_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoFavorite" ADD CONSTRAINT "VideoFavorite_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoFavorite" ADD CONSTRAINT "VideoFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortWatchLater" ADD CONSTRAINT "ShortWatchLater_shortId_fkey" FOREIGN KEY ("shortId") REFERENCES "Short"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortWatchLater" ADD CONSTRAINT "ShortWatchLater_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortFavorite" ADD CONSTRAINT "ShortFavorite_shortId_fkey" FOREIGN KEY ("shortId") REFERENCES "Short"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortFavorite" ADD CONSTRAINT "ShortFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
