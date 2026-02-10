-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "riderIds" TEXT[];

-- CreateTable
CREATE TABLE "_RiderOrders" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_RiderOrders_AB_unique" ON "_RiderOrders"("A", "B");

-- CreateIndex
CREATE INDEX "_RiderOrders_B_index" ON "_RiderOrders"("B");

-- AddForeignKey
ALTER TABLE "_RiderOrders" ADD CONSTRAINT "_RiderOrders_A_fkey" FOREIGN KEY ("A") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RiderOrders" ADD CONSTRAINT "_RiderOrders_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
