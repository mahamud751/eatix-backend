-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "logo" JSONB[],

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);
