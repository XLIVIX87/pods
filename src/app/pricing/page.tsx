export const dynamic = "force-dynamic";

import TopBar from "@/components/layout/TopBar";
import { prisma } from "@/lib/prisma";
import { formatNaira, formatBottleSize, BOTTLE_SIZES, KEG_SIZE_LITRES } from "@/lib/utils";
import { calculatePriceTiers } from "@/lib/pricing";

export default async function PricingPage() {
  const [kegStock, kegAsset, bottlePricing] = await Promise.all([
    prisma.stockLevel.findFirst({ where: { itemType: "KEG", sizeMl: 25000 } }),
    prisma.kegAsset.findFirst({ where: { id: "singleton" } }),
    prisma.bottlePricing.findMany({ orderBy: { bottleSizeMl: "asc" } }),
  ]);

  const avgCostPerLitre =
    kegStock && kegStock.totalLitres > 0
      ? kegStock.totalValue / kegStock.totalLitres
      : 0;

  const pricingMap = new Map(bottlePricing.map((p) => [p.bottleSizeMl, p]));

  return (
    <div className="min-h-dvh flex flex-col pb-24">
      <TopBar title="Pricing Dashboard" showBack variant="page" />

      <main className="flex-grow px-4 pt-4 max-w-2xl mx-auto w-full space-y-6">
        {/* Oil Cost Summary */}
        <section className="bg-gradient-to-br from-primary-fixed to-tertiary-fixed/40 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-primary-fixed">oil_barrel</span>
            <h2 className="font-headline text-xl font-semibold text-on-primary-fixed">
              Oil Cost
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-label uppercase tracking-widest text-on-primary-fixed-variant font-bold">
                Avg cost / litre
              </p>
              <p className="text-3xl font-headline font-bold text-on-primary-fixed">
                {avgCostPerLitre > 0
                  ? formatNaira(Math.round(avgCostPerLitre))
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs font-label uppercase tracking-widest text-on-primary-fixed-variant font-bold">
                Kegs in stock
              </p>
              <p className="text-3xl font-headline font-bold text-on-primary-fixed">
                {kegStock?.quantity ?? 0}
              </p>
              <p className="text-sm text-on-primary-fixed-variant">
                {((kegStock?.quantity ?? 0) * KEG_SIZE_LITRES).toLocaleString()}L &middot;{" "}
                {formatNaira(kegStock?.totalValue ?? 0)}
              </p>
            </div>
          </div>
        </section>

        {/* Keg Assets */}
        <section className="bg-surface-container-lowest rounded-xl p-5 ring-1 ring-outline/10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary">deployed_code</span>
            <h2 className="font-headline text-lg font-semibold text-on-surface">
              Keg Containers
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-container-low rounded-lg p-3 text-center">
              <p className="text-2xl font-headline font-bold text-on-surface">
                {kegAsset?.totalKegs ?? 0}
              </p>
              <p className="text-xs text-on-surface-variant font-medium">Total</p>
            </div>
            <div className="bg-primary-fixed/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-headline font-bold text-primary">
                {kegAsset?.fullKegs ?? 0}
              </p>
              <p className="text-xs text-on-surface-variant font-medium">Full</p>
            </div>
            <div className="bg-surface-container-high rounded-lg p-3 text-center">
              <p className="text-2xl font-headline font-bold text-on-surface-variant">
                {kegAsset?.emptyKegs ?? 0}
              </p>
              <p className="text-xs text-on-surface-variant font-medium">Empty</p>
            </div>
          </div>
        </section>

        {/* Recommended Prices per Bottle Size */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">sell</span>
            <h2 className="font-headline text-lg font-semibold text-on-surface">
              Recommended Prices
            </h2>
          </div>

          {avgCostPerLitre <= 0 ? (
            <div className="bg-surface-container-low rounded-xl p-8 text-center">
              <p className="text-on-surface-variant">
                No oil in stock — buy and accept a purchase to see pricing
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {BOTTLE_SIZES.map((sizeMl) => {
                const calc = calculatePriceTiers(avgCostPerLitre, sizeMl);
                const current = pricingMap.get(sizeMl);
                const currentSellPrice = current?.selectedPrice ?? 0;
                const currentMargin =
                  currentSellPrice > 0 && calc.totalCostPerUnit > 0
                    ? ((currentSellPrice - calc.totalCostPerUnit) / currentSellPrice) * 100
                    : 0;

                return (
                  <div
                    key={sizeMl}
                    className="bg-surface-container-lowest rounded-xl p-4 ring-1 ring-outline/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">
                          liquor
                        </span>
                        <span className="font-bold text-on-surface text-lg">
                          {formatBottleSize(sizeMl)}
                        </span>
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        Cost: {formatNaira(Math.round(calc.totalCostPerUnit))}
                      </span>
                    </div>

                    {/* Tier prices */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {calc.tiers.map((tier) => (
                        <div
                          key={tier.key}
                          className={`rounded-lg p-2 text-center ${
                            tier.key === "good"
                              ? "bg-success-light ring-1 ring-success/20"
                              : "bg-surface-container-low"
                          }`}
                        >
                          <p className="text-[10px] font-bold uppercase text-on-surface-variant">
                            {tier.label} ({tier.marginPct}%)
                          </p>
                          <p className="text-sm font-bold text-on-surface">
                            {formatNaira(tier.price)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Current vs recommended */}
                    {currentSellPrice > 0 && (
                      <div className="flex items-center justify-between bg-surface-container-low rounded-lg px-3 py-2">
                        <span className="text-xs text-on-surface-variant">
                          Current price:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-on-surface">
                            {formatNaira(currentSellPrice)}
                          </span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              currentMargin >= 10
                                ? "bg-success-light text-success"
                                : currentMargin >= 5
                                  ? "bg-tertiary-fixed text-on-tertiary-fixed"
                                  : "bg-error-container text-on-error-container"
                            }`}
                          >
                            {currentMargin.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
