-- CreateTable SupplierPriceQuote
CREATE TABLE "supplier_price_quotes" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "pricePerKeg" DOUBLE PRECISION NOT NULL,
    "kegSizeLitres" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "pricePerLitre" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_price_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable MarketPrice
CREATE TABLE "market_prices" (
    "id" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "bottleSizeMl" INTEGER NOT NULL,
    "pricePerUnit" DOUBLE PRECISION NOT NULL,
    "pricePerLitre" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_prices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_price_quotes_recordedAt_idx" ON "supplier_price_quotes"("recordedAt");
CREATE INDEX "market_prices_recordedAt_idx" ON "market_prices"("recordedAt");
CREATE INDEX "market_prices_bottleSizeMl_idx" ON "market_prices"("bottleSizeMl");

-- AddForeignKey
ALTER TABLE "supplier_price_quotes" ADD CONSTRAINT "supplier_price_quotes_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
