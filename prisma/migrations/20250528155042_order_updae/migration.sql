/*
  Warnings:

  - You are about to drop the column `Losss` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `Profit` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `acceptableStatus` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `adjustment` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `alibaBuyingPrice` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `alibaNetProfit` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `alibaSaleProfit` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `alibaShippingCostTotal` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `alibaShippingProfit` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `amountAdjustment` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `approvedDate` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `chinaLocalDelivery` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `companyOrderNumber` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `companyShippingPerKG` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `companyShippingWeight` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `companyTrackingNumber` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `discount` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `discountCode` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `orderNote` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `paymentStatus` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `productCategory` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `productDueAmount` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `productRMB` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `productRMBRate` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `purchaseAgentPercentage` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `receivedTk` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shippingPerKG` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalAdjustmentAmount` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmountForShipping` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalDueAmount` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalPaidAmount` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalReceiveTk` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalShippingWeight` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `discountPrice` on the `SubOrder` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `SubOrder` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `SubOrder` table. All the data in the column will be lost.
  - You are about to drop the column `selectedColor` on the `SubOrder` table. All the data in the column will be lost.
  - You are about to drop the column `selectedSize` on the `SubOrder` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_orderId_fkey";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "Losss",
DROP COLUMN "Profit",
DROP COLUMN "acceptableStatus",
DROP COLUMN "adjustment",
DROP COLUMN "alibaBuyingPrice",
DROP COLUMN "alibaNetProfit",
DROP COLUMN "alibaSaleProfit",
DROP COLUMN "alibaShippingCostTotal",
DROP COLUMN "alibaShippingProfit",
DROP COLUMN "amountAdjustment",
DROP COLUMN "approvedDate",
DROP COLUMN "chinaLocalDelivery",
DROP COLUMN "companyOrderNumber",
DROP COLUMN "companyShippingPerKG",
DROP COLUMN "companyShippingWeight",
DROP COLUMN "companyTrackingNumber",
DROP COLUMN "discount",
DROP COLUMN "discountCode",
DROP COLUMN "isDeleted",
DROP COLUMN "orderNote",
DROP COLUMN "paymentStatus",
DROP COLUMN "productCategory",
DROP COLUMN "productDueAmount",
DROP COLUMN "productRMB",
DROP COLUMN "productRMBRate",
DROP COLUMN "purchaseAgentPercentage",
DROP COLUMN "receivedTk",
DROP COLUMN "shippingPerKG",
DROP COLUMN "totalAdjustmentAmount",
DROP COLUMN "totalAmount",
DROP COLUMN "totalAmountForShipping",
DROP COLUMN "totalDueAmount",
DROP COLUMN "totalPaidAmount",
DROP COLUMN "totalReceiveTk",
DROP COLUMN "totalShippingWeight";

-- AlterTable
ALTER TABLE "SubOrder" DROP COLUMN "discountPrice",
DROP COLUMN "price",
DROP COLUMN "quantity",
DROP COLUMN "selectedColor",
DROP COLUMN "selectedSize",
ADD COLUMN     "Losss" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "Profit" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "acceptableStatus" TEXT DEFAULT 'Pending',
ADD COLUMN     "adjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "alibaBuyingPrice" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "alibaNetProfit" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "alibaSaleProfit" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "alibaShippingCostTotal" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "alibaShippingProfit" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "amountAdjustment" TEXT DEFAULT '0',
ADD COLUMN     "approvedDate" TIMESTAMP(3),
ADD COLUMN     "chinaLocalDelivery" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "companyOrderNumber" TEXT,
ADD COLUMN     "companyShippingPerKG" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "companyShippingWeight" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "companyTrackingNumber" TEXT,
ADD COLUMN     "discount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "discountCode" TEXT,
ADD COLUMN     "isDeleted" BOOLEAN DEFAULT false,
ADD COLUMN     "orderNote" TEXT,
ADD COLUMN     "paymentStatus" TEXT,
ADD COLUMN     "productCategory" TEXT,
ADD COLUMN     "productDueAmount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "productRMB" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "productRMBRate" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "purchaseAgentPercentage" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "receivedTk" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "shippingPerKG" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalAdjustmentAmount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalAmountForShipping" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalDueAmount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalPaidAmount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalReceiveTk" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalShippingWeight" DOUBLE PRECISION DEFAULT 0,
ALTER COLUMN "totalAmount" DROP NOT NULL,
ALTER COLUMN "totalAmount" SET DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SubOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
