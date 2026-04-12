-- AlterEnum: Add ADMIN to UserRole
ALTER TYPE "UserRole" ADD VALUE 'ADMIN';

-- AlterEnum: Add IN_TRANSIT to PurchaseStatus
ALTER TYPE "PurchaseStatus" ADD VALUE 'IN_TRANSIT' BEFORE 'PENDING_CHECK';

-- AlterTable: Add receivedAt to purchases
ALTER TABLE "purchases" ADD COLUMN "receivedAt" TIMESTAMP(3);

-- AlterTable: Change default status for purchases to IN_TRANSIT
ALTER TABLE "purchases" ALTER COLUMN "status" SET DEFAULT 'IN_TRANSIT';

-- AlterTable: Make purchaseId optional on packing_sessions
ALTER TABLE "packing_sessions" ALTER COLUMN "purchaseId" DROP NOT NULL;

-- DropForeignKey (to recreate as optional)
ALTER TABLE "packing_sessions" DROP CONSTRAINT "packing_sessions_purchaseId_fkey";

-- AddForeignKey (optional relation)
ALTER TABLE "packing_sessions" ADD CONSTRAINT "packing_sessions_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: keg_assets
CREATE TABLE "keg_assets" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "totalKegs" INTEGER NOT NULL DEFAULT 0,
    "fullKegs" INTEGER NOT NULL DEFAULT 0,
    "emptyKegs" INTEGER NOT NULL DEFAULT 0,
    "kegUnitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keg_assets_pkey" PRIMARY KEY ("id")
);
