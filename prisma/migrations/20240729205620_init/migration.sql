-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "userId" TEXT,
    "refferCode" TEXT,
    "gender" "Gender" NOT NULL DEFAULT 'Other',
    "password" TEXT NOT NULL,
    "address" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "userStatus" "UserStatus" NOT NULL DEFAULT 'Active',
    "branchId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
