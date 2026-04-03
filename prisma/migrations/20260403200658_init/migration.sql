-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OPERATOR', 'INVESTOR');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING_CHECK', 'ACCEPTED', 'REJECTED', 'ACCEPTED_WITH_NOTE');

-- CreateEnum
CREATE TYPE "QualityResult" AS ENUM ('ACCEPT', 'REJECT', 'ACCEPT_WITH_NOTE');

-- CreateEnum
CREATE TYPE "StockItemType" AS ENUM ('KEG', 'BOTTLE');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('NEW', 'RETURNING');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('DELIVER', 'PICKUP');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'TRANSFER', 'POS');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PART', 'OWED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kegs" INTEGER NOT NULL,
    "kegSizeLitres" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "pricePerKeg" DOUBLE PRECISION NOT NULL,
    "transportCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "costPerLitre" DOUBLE PRECISION NOT NULL,
    "photoUrl" TEXT,
    "waybillPhotoUrl" TEXT,
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING_CHECK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_checks" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "colourPass" BOOLEAN,
    "smellPass" BOOLEAN,
    "tastePass" BOOLEAN,
    "waterPass" BOOLEAN,
    "result" "QualityResult",
    "note" TEXT,
    "photoUrl" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quality_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packing_sessions" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "kegsOpened" INTEGER NOT NULL,
    "litresAvailable" DOUBLE PRECISION NOT NULL,
    "litresPacked" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "litresDifference" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packing_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packed_products" (
    "id" TEXT NOT NULL,
    "packingSessionId" TEXT NOT NULL,
    "bottleSizeMl" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "costPerUnit" DOUBLE PRECISION NOT NULL,
    "selectedPriceTier" TEXT,
    "sellPrice" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "packed_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bottle_pricing" (
    "id" TEXT NOT NULL,
    "bottleSizeMl" INTEGER NOT NULL,
    "containerCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentCostPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "safePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "goodPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "strongPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "selectedPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bottle_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_levels" (
    "id" TEXT NOT NULL,
    "itemType" "StockItemType" NOT NULL,
    "sizeMl" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "totalLitres" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "location" TEXT,
    "customerType" "CustomerType" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryMethod" "DeliveryMethod" NOT NULL DEFAULT 'PICKUP',
    "driverName" TEXT,
    "deliveryCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,
    "marginPct" DOUBLE PRECISION NOT NULL,
    "complaint" BOOLEAN NOT NULL DEFAULT false,
    "complaintText" TEXT,
    "sourcePurchaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "bottleSizeMl" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "lineTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "balanceOwed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'OWED',
    "expectedPaymentDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "quality_checks_purchaseId_key" ON "quality_checks"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "bottle_pricing_bottleSizeMl_key" ON "bottle_pricing"("bottleSizeMl");

-- CreateIndex
CREATE UNIQUE INDEX "stock_levels_itemType_sizeMl_key" ON "stock_levels"("itemType", "sizeMl");

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_checks" ADD CONSTRAINT "quality_checks_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packing_sessions" ADD CONSTRAINT "packing_sessions_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packed_products" ADD CONSTRAINT "packed_products_packingSessionId_fkey" FOREIGN KEY ("packingSessionId") REFERENCES "packing_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_sourcePurchaseId_fkey" FOREIGN KEY ("sourcePurchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
