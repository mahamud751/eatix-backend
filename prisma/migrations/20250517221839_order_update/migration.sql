-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "amountAdjustment" TEXT DEFAULT '0',
ADD COLUMN     "orderId" TEXT;

-- CreateTable
CREATE TABLE "OrderNote" (
    "id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderNote_pkey" PRIMARY KEY ("id")
);
