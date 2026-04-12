"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import StepperProgress from "@/components/shared/StepperProgress";
import QuantitySelector from "@/components/shared/QuantitySelector";
import PriceTierSelector from "@/components/shared/PriceTierSelector";
import {
  formatNaira,
  formatBottleSize,
  BOTTLE_SIZES,
  KEG_SIZE_LITRES,
} from "@/lib/utils";
import { calculatePriceTiers } from "@/lib/pricing";
import type { PriceTier } from "@/lib/pricing";

interface StockItem {
  itemType: string;
  sizeMl: number;
  quantity: number;
  totalLitres: number;
  totalValue: number;
}

interface BottleEntry {
  sizeMl: number;
  quantity: number;
  selectedTier: string | null;
  sellPrice: number;
}

export default function PackPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Step 1: Kegs from pooled stock
  const [kegStock, setKegStock] = useState<StockItem | null>(null);
  const [kegsToOpen, setKegsToOpen] = useState(1);

  // Step 2: Bottle quantities
  const [bottles, setBottles] = useState<BottleEntry[]>(
    BOTTLE_SIZES.map((size) => ({
      sizeMl: size,
      quantity: 0,
      selectedTier: null,
      sellPrice: 0,
    }))
  );

  // Fetch keg stock
  useEffect(() => {
    setLoading(true);
    fetch("/api/stock")
      .then((r) => r.json())
      .then((data: StockItem[]) => {
        const keg = data.find(
          (s) => s.itemType === "KEG" && s.sizeMl === 25000
        );
        setKegStock(keg || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const availableKegs = kegStock?.quantity ?? 0;
  const averageCostPerLitre =
    kegStock && kegStock.totalLitres > 0
      ? kegStock.totalValue / kegStock.totalLitres
      : 0;

  // Litres calculations
  const litresAvailable = kegsToOpen * KEG_SIZE_LITRES;
  const litresPacked = useMemo(() => {
    return bottles.reduce(
      (sum, b) => sum + (b.sizeMl / 1000) * b.quantity,
      0
    );
  }, [bottles]);
  const litresDifference = litresAvailable - litresPacked;
  const packingPercentage =
    litresAvailable > 0
      ? Math.min(100, (litresPacked / litresAvailable) * 100)
      : 0;

  // Price tiers per bottle size — based on average cost from pooled stock
  const priceTiers = useMemo(() => {
    if (averageCostPerLitre <= 0) return {};
    const tiers: Record<number, ReturnType<typeof calculatePriceTiers>> = {};
    for (const size of BOTTLE_SIZES) {
      tiers[size] = calculatePriceTiers(averageCostPerLitre, size);
    }
    return tiers;
  }, [averageCostPerLitre]);

  const updateBottle = (sizeMl: number, updates: Partial<BottleEntry>) => {
    setBottles((prev) =>
      prev.map((b) => (b.sizeMl === sizeMl ? { ...b, ...updates } : b))
    );
  };

  const handleTierSelect = (sizeMl: number, tier: PriceTier) => {
    updateBottle(sizeMl, {
      selectedTier: tier.key,
      sellPrice: tier.price,
    });
  };

  const bottlesWithQuantity = bottles.filter((b) => b.quantity > 0);
  const allPriced = bottlesWithQuantity.every((b) => b.selectedTier !== null);

  const canProceedStep1 = availableKegs > 0 && kegsToOpen > 0;
  const canProceedStep2 =
    bottlesWithQuantity.length > 0 && litresPacked <= litresAvailable;
  const canFinish =
    allPriced &&
    bottlesWithQuantity.length > 0 &&
    litresPacked <= litresAvailable;

  const handleSaveBatch = async () => {
    if (!canFinish) return;
    setSaving(true);

    try {
      const res = await fetch("/api/packing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseId: null,
          kegsOpened: kegsToOpen,
          litresAvailable,
          litresPacked,
          litresDifference,
          costPerLitre: averageCostPerLitre,
          bottles: bottlesWithQuantity.map((b) => ({
            bottleSizeMl: b.sizeMl,
            quantity: b.quantity,
            costPerUnit: priceTiers[b.sizeMl]?.totalCostPerUnit ?? 0,
            selectedPriceTier: b.selectedTier,
            sellPrice: b.sellPrice,
          })),
        }),
      });

      if (res.ok) {
        router.push("/stock");
      }
    } catch (error) {
      console.error("Failed to save packing session:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col pb-24">
      <TopBar title="Pack bottles" showBack variant="page" />

      <main className="flex-grow px-4 pt-4 max-w-2xl mx-auto w-full">
        <StepperProgress currentStep={step} totalSteps={3} />

        {/* Step 1: Select kegs from pooled stock */}
        {step === 1 && (
          <section className="space-y-6">
            <h2 className="font-headline text-3xl font-semibold text-on-surface leading-tight">
              How many kegs to open?
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <span className="material-symbols-outlined animate-spin text-primary text-3xl">
                  progress_activity
                </span>
              </div>
            ) : availableKegs === 0 ? (
              <div className="bg-surface-container-low p-8 rounded-xl text-center space-y-3">
                <span className="material-symbols-outlined text-4xl text-outline">
                  inventory_2
                </span>
                <p className="text-on-surface-variant font-medium">
                  No kegs in stock
                </p>
                <p className="text-sm text-on-surface-variant/70">
                  Buy oil and pass quality checks first
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stock Summary */}
                <div className="bg-primary-fixed rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-on-primary-fixed text-lg">
                      oil_barrel
                    </span>
                    <span className="font-label text-xs font-bold text-on-primary-fixed-variant uppercase tracking-widest">
                      Available Stock
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-3xl font-headline font-bold text-on-primary-fixed">
                        {availableKegs}
                      </p>
                      <p className="text-sm text-on-primary-fixed-variant">
                        kegs ({availableKegs * KEG_SIZE_LITRES}L)
                      </p>
                    </div>
                    <div>
                      <p className="text-3xl font-headline font-bold text-on-primary-fixed">
                        {formatNaira(Math.round(averageCostPerLitre))}
                      </p>
                      <p className="text-sm text-on-primary-fixed-variant">
                        avg cost per litre
                      </p>
                    </div>
                  </div>
                </div>

                {/* Keg Selector */}
                <div className="space-y-4">
                  <p className="font-label text-xs font-bold text-outline uppercase tracking-wider text-center">
                    Kegs to open
                  </p>
                  <div className="bg-surface-container-low p-4 rounded-xl flex justify-center">
                    <QuantitySelector
                      value={kegsToOpen}
                      onChange={setKegsToOpen}
                      min={1}
                      max={availableKegs}
                    />
                  </div>
                </div>

                {/* Litres available */}
                <div className="bg-tertiary-fixed rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-on-tertiary-fixed text-lg">
                      water_drop
                    </span>
                    <span className="font-label text-xs font-bold text-on-tertiary-fixed-variant uppercase tracking-widest">
                      Litres available
                    </span>
                  </div>
                  <p className="text-3xl font-headline font-bold text-on-tertiary-fixed">
                    {litresAvailable}L
                  </p>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Step 2: Bottle Grid */}
        {step === 2 && (
          <section className="space-y-6">
            <div className="text-center mb-2">
              <h2 className="font-headline text-3xl font-semibold text-on-surface leading-tight mb-2">
                Fill the bottles
              </h2>
              <p className="text-on-surface-variant font-body italic text-lg opacity-80">
                {litresAvailable}L available from {kegsToOpen} keg
                {kegsToOpen > 1 ? "s" : ""}
              </p>
            </div>

            {/* Bottle Grid */}
            <div className="grid grid-cols-2 gap-3">
              {BOTTLE_SIZES.map((size) => {
                const bottle = bottles.find((b) => b.sizeMl === size)!;
                return (
                  <div
                    key={size}
                    className="bg-surface-container-low rounded-xl p-4 flex flex-col items-center gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-xl">
                        liquor
                      </span>
                      <span className="font-bold text-lg text-on-surface">
                        {formatBottleSize(size)}
                      </span>
                    </div>
                    <QuantitySelector
                      value={bottle.quantity}
                      onChange={(v) => updateBottle(size, { quantity: v })}
                      min={0}
                      max={999}
                      size="sm"
                    />
                    {bottle.quantity > 0 && (
                      <span className="text-xs text-on-surface-variant font-medium">
                        {((size / 1000) * bottle.quantity).toFixed(1)}L
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Litre Reconciliation */}
            <div className="bg-surface-container-low rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-label text-xs font-bold text-outline uppercase tracking-widest">
                  Litre reconciliation
                </span>
                <span
                  className={`text-sm font-bold ${
                    litresDifference < 0
                      ? "text-error"
                      : litresDifference === 0
                        ? "text-success"
                        : "text-on-surface-variant"
                  }`}
                >
                  {litresDifference > 0
                    ? `${litresDifference.toFixed(1)}L remaining`
                    : litresDifference < 0
                      ? `${Math.abs(litresDifference).toFixed(1)}L over!`
                      : "Perfect match"}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    litresPacked > litresAvailable
                      ? "bg-error"
                      : packingPercentage === 100
                        ? "bg-success"
                        : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(100, packingPercentage)}%` }}
                />
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">
                  Packed:{" "}
                  <span className="font-bold text-on-surface">
                    {litresPacked.toFixed(1)}L
                  </span>
                </span>
                <span className="text-on-surface-variant">
                  Available:{" "}
                  <span className="font-bold text-on-surface">
                    {litresAvailable}L
                  </span>
                </span>
              </div>

              {litresPacked > litresAvailable && (
                <div className="flex items-center gap-2 bg-error/10 p-3 rounded-lg">
                  <span className="material-symbols-outlined text-error text-lg">
                    warning
                  </span>
                  <span className="text-sm font-medium text-error">
                    You have packed more litres than available. Please check
                    your quantities.
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Step 3: Smart Pricing */}
        {step === 3 && (
          <section className="space-y-6">
            <div className="text-center mb-2">
              <h2 className="font-headline text-3xl font-semibold text-on-surface leading-tight mb-2">
                Set your prices
              </h2>
              <p className="text-on-surface-variant font-body italic text-lg opacity-80">
                Choose a price tier for each bottle size
              </p>
            </div>

            {bottlesWithQuantity.length === 0 ? (
              <div className="bg-surface-container-low p-8 rounded-xl text-center space-y-3">
                <span className="material-symbols-outlined text-4xl text-outline">
                  production_quantity_limits
                </span>
                <p className="text-on-surface-variant font-medium">
                  No bottles packed yet
                </p>
                <p className="text-sm text-on-surface-variant/70">
                  Go back and add bottle quantities
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {bottlesWithQuantity.map((bottle) => {
                  const tierData = priceTiers[bottle.sizeMl];
                  if (!tierData) return null;

                  return (
                    <div key={bottle.sizeMl}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-label text-xs font-bold text-outline uppercase tracking-wider">
                          {bottle.quantity}x {formatBottleSize(bottle.sizeMl)}
                        </span>
                      </div>
                      <PriceTierSelector
                        tiers={tierData.tiers}
                        selectedTier={bottle.selectedTier}
                        onSelect={(tier) =>
                          handleTierSelect(bottle.sizeMl, tier)
                        }
                        bottleLabel={formatBottleSize(bottle.sizeMl)}
                        costPerUnit={tierData.totalCostPerUnit}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Batch Summary */}
            {bottlesWithQuantity.length > 0 && (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-tertiary-fixed to-primary-fixed/30 p-6 shadow-sm">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                <div className="relative z-10 space-y-3">
                  <span className="text-xs font-label uppercase tracking-widest text-on-tertiary-fixed-variant font-bold">
                    Batch Summary
                  </span>
                  {bottlesWithQuantity.map((b) => (
                    <div
                      key={b.sizeMl}
                      className="flex justify-between items-center"
                    >
                      <span className="text-on-primary-fixed font-medium">
                        {b.quantity}x {formatBottleSize(b.sizeMl)}
                      </span>
                      <span className="font-bold text-on-primary-fixed">
                        {b.sellPrice > 0
                          ? `${formatNaira(b.sellPrice)} each`
                          : "Not priced"}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-on-tertiary-fixed-variant/15 pt-3 flex justify-between items-center">
                    <span className="font-bold text-on-primary-fixed">
                      Total bottles
                    </span>
                    <span className="text-2xl font-headline font-bold text-on-primary-fixed">
                      {bottlesWithQuantity.reduce(
                        (sum, b) => sum + b.quantity,
                        0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Fixed Footer Action */}
      <footer className="fixed bottom-0 left-0 w-full p-4 bg-surface/90 backdrop-blur-md z-50">
        <div className="max-w-2xl mx-auto">
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2)
              }
              className="w-full h-16 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-xl rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Next Step
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={handleSaveBatch}
              disabled={saving || !canFinish}
              className="w-full h-16 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xl rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin">
                    progress_activity
                  </span>
                  Saving...
                </>
              ) : (
                <>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  Finish &amp; Save Batch
                </>
              )}
            </button>
          )}

          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="w-full mt-2 py-3 text-on-surface-variant font-medium text-sm"
            >
              Go back
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
