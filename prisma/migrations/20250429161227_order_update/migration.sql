/*
  Warnings:

  - The values [pending,processing,approved,canceled,delivered] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `paidAmount` on the `Order` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('Waiting for payment', 'Partial Paid', 'Full Paid', 'Purchased', 'Shipped from Supplier', 'Received in China Warehouse', 'Shipped from China Warehouse', 'BD Customs', 'Ready to Deliver', 'Delivered', 'Out of Stock', 'Refunded', 'Pending');
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'Pending';
COMMIT;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "paidAmount",
ADD COLUMN     "Losss" DOUBLE PRECISION,
ADD COLUMN     "Profit" DOUBLE PRECISION,
ADD COLUMN     "chinaLocalDelivery" DOUBLE PRECISION,
ADD COLUMN     "companyOrderNumber" TEXT,
ADD COLUMN     "companyShippingPerKG" DOUBLE PRECISION,
ADD COLUMN     "companyShippingWeight" DOUBLE PRECISION,
ADD COLUMN     "companyTrackingNumber" TEXT,
ADD COLUMN     "discountCode" TEXT,
ADD COLUMN     "orderNote" TEXT,
ADD COLUMN     "productCategory" TEXT,
ADD COLUMN     "productDueAmount" DOUBLE PRECISION,
ADD COLUMN     "productRMB" DOUBLE PRECISION,
ADD COLUMN     "productRMBRate" DOUBLE PRECISION,
ADD COLUMN     "purchaseAgentPercentage" DOUBLE PRECISION,
ADD COLUMN     "shippingPerKG" DOUBLE PRECISION,
ADD COLUMN     "totalAdjustmentAmount" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "totalAmountForShipping" DOUBLE PRECISION,
ADD COLUMN     "totalPaidAmount" DOUBLE PRECISION,
ADD COLUMN     "totalShippingWeight" DOUBLE PRECISION,
ALTER COLUMN "status" SET DEFAULT 'Pending',
ALTER COLUMN "discount" SET DEFAULT 0;
