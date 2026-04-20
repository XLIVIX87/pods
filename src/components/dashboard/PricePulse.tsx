import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatBottleSize, formatNaira } from "@/lib/utils";

export default async function PricePulse() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [recentSupplier, allSupplier, recentMarket, allMarket] = await Promise.all([
    prisma.supplierPriceQuote.findMany({
      where: { recordedAt: { gte: sevenDaysAgo } },
      include: { supplier: true },
      orderBy: { pricePerLitre: "asc" },
    }),
    prisma.supplierPriceQuote.findMany({
      include: { supplier: true },
      orderBy: { recordedAt: "desc" },
      take: 5,
    }),
    prisma.marketPrice.findMany({
      where: { recordedAt: { gte: sevenDaysAgo } },
      orderBy: { recordedAt: "desc" },
    }),
    prisma.marketPrice.findMany({
      orderBy: { recordedAt: "desc" },
      take: 20,
    }),
  ]);

  const supplierPool = recentSupplier.length > 0 ? recentSupplier : allSupplier;
  const bestSupplier =
    supplierPool.length > 0
      ? supplierPool.reduce((min, q) =>
          q.pricePerLitre < min.pricePerLitre ? q : min
        )
      : null;

  // Roll up market prices per bottle size, pick top 3 by sample count
  const marketPool = recentMarket.length > 0 ? recentMarket : allMarket;
  const byBottle = new Map<number, { total: number; count: number }>();
  marketPool.forEach((m) => {
    const b = byBottle.get(m.bottleSizeMl) ?? { total: 0, count: 0 };
    b.total += m.pricePerUnit;
    b.count += 1;
    byBottle.set(m.bottleSizeMl, b);
  });
  const marketRows = Array.from(byBottle.entries())
    .map(([size, { total, count }]) => ({
      size,
      avg: total / count,
      recommended: Math.round((total / count) * 0.98),
      count,
    }))
    .sort((a, b) => a.size - b.size)
    .slice(0, 3);

  const empty = !bestSupplier && marketRows.length === 0;

  return (
    <Link
      href="/prices"
      className="block rounded-2xl bg-tertiary-container text-on-tertiary-container p-5 active:scale-[0.99] transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined">price_change</span>
          <p className="font-bold text-sm uppercase tracking-widest">
            Price Pulse
          </p>
        </div>
        <span className="material-symbols-outlined text-on-tertiary-container/70">
          arrow_forward
        </span>
      </div>

      {empty ? (
        <p className="text-sm opacity-80">
          Log your first supplier quote or market price to get recommended sell prices here.
        </p>
      ) : (
        <div className="space-y-3">
          {bestSupplier && (
            <div className="flex items-baseline justify-between">
              <span className="text-xs opacity-80">Best supplier</span>
              <span className="font-bold">
                {formatNaira(Math.round(bestSupplier.pricePerLitre))}
                <span className="text-xs font-normal opacity-80">/L</span>
                <span className="text-xs font-normal opacity-70 ml-2">
                  · {bestSupplier.supplier.name}
                </span>
              </span>
            </div>
          )}

          {marketRows.length > 0 && (
            <div className="pt-3 border-t border-on-tertiary-container/15 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                Recommended sell price
              </p>
              {marketRows.map((row) => (
                <div
                  key={row.size}
                  className="flex items-baseline justify-between"
                >
                  <span className="text-xs opacity-80">
                    {formatBottleSize(row.size)}
                    <span className="opacity-60 ml-1">
                      · mkt {formatNaira(Math.round(row.avg))}
                    </span>
                  </span>
                  <span className="font-bold">
                    {formatNaira(row.recommended)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
