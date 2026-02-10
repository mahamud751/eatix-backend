-- CreateTable
CREATE TABLE "Wishlist" (
    "id" TEXT NOT NULL,
    "nameName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_WishlistProducts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Wishlist_email_key" ON "Wishlist"("email");

-- CreateIndex
CREATE UNIQUE INDEX "_WishlistProducts_AB_unique" ON "_WishlistProducts"("A", "B");

-- CreateIndex
CREATE INDEX "_WishlistProducts_B_index" ON "_WishlistProducts"("B");

-- AddForeignKey
ALTER TABLE "_WishlistProducts" ADD CONSTRAINT "_WishlistProducts_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_WishlistProducts" ADD CONSTRAINT "_WishlistProducts_B_fkey" FOREIGN KEY ("B") REFERENCES "Wishlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
