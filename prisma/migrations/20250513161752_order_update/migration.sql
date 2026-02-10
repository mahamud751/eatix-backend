/*
  Warnings:

  - You are about to drop the column `dueAmount` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "dueAmount",
ALTER COLUMN "receivedTk" SET DEFAULT 0,
ALTER COLUMN "totalReceiveTk" SET DEFAULT 0,
ALTER COLUMN "Losss" SET DEFAULT 0,
ALTER COLUMN "Profit" SET DEFAULT 0,
ALTER COLUMN "chinaLocalDelivery" SET DEFAULT 0,
ALTER COLUMN "companyShippingPerKG" SET DEFAULT 0,
ALTER COLUMN "companyShippingWeight" SET DEFAULT 0,
ALTER COLUMN "productDueAmount" SET DEFAULT 0,
ALTER COLUMN "productRMB" SET DEFAULT 0,
ALTER COLUMN "productRMBRate" SET DEFAULT 0,
ALTER COLUMN "purchaseAgentPercentage" SET DEFAULT 0,
ALTER COLUMN "shippingPerKG" SET DEFAULT 0,
ALTER COLUMN "totalAmountForShipping" SET DEFAULT 0,
ALTER COLUMN "totalPaidAmount" SET DEFAULT 0,
ALTER COLUMN "totalShippingWeight" SET DEFAULT 0,
ALTER COLUMN "alibaBuyingPrice" SET DEFAULT 0,
ALTER COLUMN "alibaNetProfit" SET DEFAULT 0,
ALTER COLUMN "alibaSaleProfit" SET DEFAULT 0,
ALTER COLUMN "alibaShippingCostTotal" SET DEFAULT 0,
ALTER COLUMN "alibaShippingProfit" SET DEFAULT 0,
ALTER COLUMN "totalDueAmount" SET DEFAULT 0;
