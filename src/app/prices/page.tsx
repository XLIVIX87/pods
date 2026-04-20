export const dynamic = "force-dynamic";

import BottomNav from "@/components/layout/BottomNav";
import TopBar from "@/components/layout/TopBar";
import PriceTrackerClient from "./PriceTrackerClient";
import { prisma } from "@/lib/prisma";

export default async function PricesPage() {
  const [suppliers, supplierQuotes, marketPrices] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.supplierPriceQuote.findMany({
      include: { supplier: true },
      orderBy: { recordedAt: "desc" },
      take: 50,
    }),
    prisma.marketPrice.findMany({
      orderBy: { recordedAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="min-h-dvh pb-32">
      <TopBar />
      <PriceTrackerClient
        suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        initialSupplierQuotes={supplierQuotes.map((q) => ({
          id: q.id,
          supplierId: q.supplierId,
          supplierName: q.supplier.name,
          pricePerKeg: q.pricePerKeg,
          kegSizeLitres: q.kegSizeLitres,
          pricePerLitre: q.pricePerLitre,
          note: q.note,
          recordedAt: q.recordedAt.toISOString(),
        }))}
        initialMarketPrices={marketPrices.map((m) => ({
          id: m.id,
          sourceLabel: m.sourceLabel,
          bottleSizeMl: m.bottleSizeMl,
          pricePerUnit: m.pricePerUnit,
          pricePerLitre: m.pricePerLitre,
          note: m.note,
          recordedAt: m.recordedAt.toISOString(),
        }))}
      />
      <BottomNav />
    </div>
  );
}
