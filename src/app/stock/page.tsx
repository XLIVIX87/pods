export const dynamic = "force-dynamic";

import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";
import { prisma } from "@/lib/prisma";
import { formatNaira, formatBottleSize, KEG_SIZE_LITRES } from "@/lib/utils";

export default async function StockPage() {
  const stockLevels = await prisma.stockLevel.findMany({
    orderBy: [{ itemType: "asc" }, { sizeMl: "asc" }],
  });

  const kegStock = stockLevels.find((s) => s.itemType === "KEG");
  const bottleStocks = stockLevels.filter((s) => s.itemType === "BOTTLE");

  const kegCount = kegStock?.quantity ?? 0;
  const kegLitres = kegCount * KEG_SIZE_LITRES;
  const kegValue = kegStock?.totalValue ?? 0;

  const totalBottleLitres = bottleStocks.reduce(
    (sum, s) => sum + s.totalLitres,
    0
  );
  const totalBottleValue = bottleStocks.reduce(
    (sum, s) => sum + s.totalValue,
    0
  );

  const totalLitres = kegLitres + totalBottleLitres;
  const totalValue = kegValue + totalBottleValue;

  // Icon map for bottle sizes
  const bottleIcons: Record<number, string> = {
    750: "local_bar",
    1000: "liquor",
    2000: "water_bottle_large",
    3000: "wine_bar",
    4000: "local_drink",
    5000: "water_bottle_large",
  };

  return (
    <div className="min-h-dvh flex flex-col pb-40">
      <TopBar title="What do I have?" showBack variant="page" />

      <main className="flex-grow px-4 pt-4 max-w-2xl mx-auto w-full space-y-8">
        {/* ── Bulk Kegs Section ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              inventory_2
            </span>
            <h2 className="font-headline text-2xl font-semibold text-on-surface">
              Bulk kegs
            </h2>
            <span className="font-label text-xs text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
              Unopened
            </span>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-tertiary-fixed to-primary-fixed/30 p-6 shadow-sm">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
            <div className="relative z-10 grid grid-cols-3 gap-6">
              <div>
                <span className="text-xs font-label uppercase tracking-widest text-on-tertiary-fixed-variant font-bold block mb-1">
                  Kegs
                </span>
                <p className="text-3xl font-headline font-bold text-on-primary-fixed">
                  {kegCount}
                </p>
              </div>
              <div>
                <span className="text-xs font-label uppercase tracking-widest text-on-tertiary-fixed-variant font-bold block mb-1">
                  Litres
                </span>
                <p className="text-3xl font-headline font-bold text-on-primary-fixed">
                  {kegLitres}L
                </p>
              </div>
              <div>
                <span className="text-xs font-label uppercase tracking-widest text-on-tertiary-fixed-variant font-bold block mb-1">
                  Value
                </span>
                <p className="text-2xl font-headline font-bold text-on-primary-fixed">
                  {formatNaira(kegValue)}
                </p>
              </div>
            </div>
          </div>

          {kegCount === 0 && (
            <div className="flex items-center gap-2 bg-surface-container-low p-3 rounded-lg">
              <span className="material-symbols-outlined text-outline text-lg">
                info
              </span>
              <span className="text-sm text-on-surface-variant">
                No kegs in stock. Buy oil to get started.
              </span>
            </div>
          )}
        </section>

        {/* ── Packed Bottles Section ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">
              liquor
            </span>
            <h2 className="font-headline text-2xl font-semibold text-on-surface">
              Packed bottles
            </h2>
          </div>

          {bottleStocks.length === 0 ? (
            <div className="bg-surface-container-low p-8 rounded-xl text-center space-y-3">
              <span className="material-symbols-outlined text-4xl text-outline">
                production_quantity_limits
              </span>
              <p className="text-on-surface-variant font-medium">
                No bottles packed yet
              </p>
              <p className="text-sm text-on-surface-variant/70">
                Open kegs and pack bottles to see stock here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {bottleStocks.map((stock, index) => {
                const isLowStock = stock.quantity < 10;
                const isLastOdd =
                  index === bottleStocks.length - 1 &&
                  bottleStocks.length % 2 !== 0;

                return (
                  <div
                    key={stock.id}
                    className={`relative bg-surface-container-low rounded-xl p-5 shadow-sm ${
                      isLastOdd ? "col-span-2" : ""
                    }`}
                  >
                    {/* Low stock warning badge */}
                    {isLowStock && stock.quantity > 0 && (
                      <div className="absolute -top-2 -right-2 z-10 bg-error px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                        <span className="material-symbols-outlined text-white text-[10px]">
                          warning
                        </span>
                        <span className="text-[9px] font-bold text-white uppercase tracking-wider">
                          Low
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isLowStock && stock.quantity > 0
                            ? "bg-error/10 text-error"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">
                          {bottleIcons[stock.sizeMl] ?? "liquor"}
                        </span>
                      </div>
                      <span className="font-bold text-lg text-on-surface">
                        {formatBottleSize(stock.sizeMl)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="font-label text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                          Count
                        </span>
                        <span
                          className={`text-2xl font-headline font-bold ${
                            stock.quantity === 0
                              ? "text-outline"
                              : isLowStock
                                ? "text-error"
                                : "text-on-surface"
                          }`}
                        >
                          {stock.quantity}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="font-label text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                          Value
                        </span>
                        <span className="text-sm font-semibold text-on-surface-variant">
                          {formatNaira(stock.totalValue)}
                        </span>
                      </div>
                    </div>

                    {stock.quantity === 0 && (
                      <div className="mt-3 flex items-center gap-1 text-outline">
                        <span className="material-symbols-outlined text-sm">
                          remove_shopping_cart
                        </span>
                        <span className="text-xs font-medium">
                          Out of stock
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ── Fixed Bottom Summary Bar ── */}
      <div className="fixed bottom-20 left-0 w-full z-40">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-gradient-to-r from-primary to-primary-container rounded-xl p-4 shadow-lg shadow-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xl">
                  water_drop
                </span>
              </div>
              <div>
                <span className="text-[10px] font-label uppercase tracking-widest text-on-primary/70 font-bold block">
                  Total stock
                </span>
                <span className="text-xl font-headline font-bold text-on-primary">
                  {totalLitres.toFixed(1)}L
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-label uppercase tracking-widest text-on-primary/70 font-bold block">
                Total value
              </span>
              <span className="text-xl font-headline font-bold text-on-primary">
                {formatNaira(totalValue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
