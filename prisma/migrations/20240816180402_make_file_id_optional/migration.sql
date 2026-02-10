/*
  Warnings:

  - The values [Active,Deactive,Blocked] on the enum `UserStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [Pending,Processing,Approved,Canceled] on the enum `VendorStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserStatus_new" AS ENUM ('active', 'deactive', 'blocked');
ALTER TABLE "User" ALTER COLUMN "userStatus" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "userStatus" TYPE "UserStatus_new" USING ("userStatus"::text::"UserStatus_new");
ALTER TYPE "UserStatus" RENAME TO "UserStatus_old";
ALTER TYPE "UserStatus_new" RENAME TO "UserStatus";
DROP TYPE "UserStatus_old";
ALTER TABLE "User" ALTER COLUMN "userStatus" SET DEFAULT 'active';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "VendorStatus_new" AS ENUM ('pending', 'processing', 'approved', 'canceled');
ALTER TABLE "Vendor" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Vendor" ALTER COLUMN "status" TYPE "VendorStatus_new" USING ("status"::text::"VendorStatus_new");
ALTER TYPE "VendorStatus" RENAME TO "VendorStatus_old";
ALTER TYPE "VendorStatus_new" RENAME TO "VendorStatus";
DROP TYPE "VendorStatus_old";
ALTER TABLE "Vendor" ALTER COLUMN "status" SET DEFAULT 'pending';
COMMIT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "userStatus" SET DEFAULT 'active';

-- AlterTable
ALTER TABLE "Vendor" ALTER COLUMN "status" SET DEFAULT 'pending';
