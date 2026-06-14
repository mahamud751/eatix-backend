-- CreateTable
CREATE TABLE "RestaurantOrderRiderReview" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantOrderRiderReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantOrderRiderReview_orderId_key" ON "RestaurantOrderRiderReview"("orderId");

-- CreateIndex
CREATE INDEX "RestaurantOrderRiderReview_userId_idx" ON "RestaurantOrderRiderReview"("userId");

-- CreateIndex
CREATE INDEX "RestaurantOrderRiderReview_riderId_idx" ON "RestaurantOrderRiderReview"("riderId");

-- CreateIndex
CREATE INDEX "RestaurantOrderRiderReview_rating_idx" ON "RestaurantOrderRiderReview"("rating");

-- CreateIndex
CREATE INDEX "RestaurantOrderRiderReview_createdAt_idx" ON "RestaurantOrderRiderReview"("createdAt");

-- AddForeignKey
ALTER TABLE "RestaurantOrderRiderReview" ADD CONSTRAINT "RestaurantOrderRiderReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrderRiderReview" ADD CONSTRAINT "RestaurantOrderRiderReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantOrderRiderReview" ADD CONSTRAINT "RestaurantOrderRiderReview_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
