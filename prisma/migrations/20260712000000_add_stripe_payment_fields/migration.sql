-- AlterTable
ALTER TABLE "RestaurantOrder" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE "RestaurantOrder" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "RestaurantOrder" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;
ALTER TABLE "RestaurantOrder" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RestaurantOrder" ALTER COLUMN "currency" SET DEFAULT 'GBP';

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantOrder_stripePaymentIntentId_key" ON "RestaurantOrder"("stripePaymentIntentId");
