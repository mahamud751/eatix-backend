-- CreateTable
CREATE TABLE "_LastVisitedProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_LastVisitedProducts_AB_unique" ON "_LastVisitedProducts"("A", "B");

-- CreateIndex
CREATE INDEX "_LastVisitedProducts_B_index" ON "_LastVisitedProducts"("B");

-- AddForeignKey
ALTER TABLE "_LastVisitedProducts" ADD CONSTRAINT "_LastVisitedProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LastVisitedProducts" ADD CONSTRAINT "_LastVisitedProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
