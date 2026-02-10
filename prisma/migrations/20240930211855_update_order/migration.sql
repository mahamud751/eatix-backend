-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'APPROVED', 'CANCELED');

-- CreateEnum
CREATE TYPE "CancelStatus" AS ENUM ('YES', 'NO');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "getState" JSONB,
    "grandPrice" TEXT,
    "selectedSize" TEXT,
    "selectedColor" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "userId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "streetAddress" TEXT,
    "country" TEXT,
    "district" TEXT,
    "apartment" TEXT,
    "postCode" TEXT,
    "address" TEXT,
    "gender" "Gender",
    "paymentType" TEXT,
    "paymentNumber" TEXT,
    "transactionId" TEXT,
    "bkashNumber" TEXT,
    "bkashTrx" TEXT,
    "rocketNumber" TEXT,
    "rocketTrx" TEXT,
    "dutchNumber" TEXT,
    "dutchTrx" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DOUBLE PRECISION,
    "receivedTk" DOUBLE PRECISION,
    "dueAmount" DOUBLE PRECISION,
    "totalReceiveTk" DOUBLE PRECISION,
    "unReceivedTk" DOUBLE PRECISION,
    "paymentStatus" TEXT,
    "bookingExtend" BOOLEAN,
    "isCancel" "CancelStatus" NOT NULL DEFAULT 'NO',
    "userCancel" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);
