-- AlterTable
ALTER TABLE "User" ADD COLUMN "contentAreaKm" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN "pickupAreaKm" DOUBLE PRECISION;

-- Backfill content area from existing delivery area for owners/vendors
UPDATE "User"
SET "contentAreaKm" = "deliveryAreaKm"
WHERE "contentAreaKm" IS NULL
  AND "deliveryAreaKm" IS NOT NULL
  AND LOWER(COALESCE("role", '')) IN ('owner', 'vendor');
