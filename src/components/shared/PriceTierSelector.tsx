"use client";

import { formatNaira } from "@/lib/utils";
import type { PriceTier } from "@/lib/pricing";

interface PriceTierSelectorProps {
  tiers: PriceTier[];
  selectedTier: string | null;
  onSelect: (tier: PriceTier) => void;
  bottleLabel: string;
  costPerUnit: number;
}

export default function PriceTierSelector({
  tiers,
  selectedTier,
  onSelect,
  bottleLabel,
  costPerUnit,
}: PriceTierSelectorProps) {
  return (
    <div className="bg-surface-container-low p-6 rounded-2xl space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-2xl">liquor</span>
          </div>
          <div>
            <h3 className="font-bold text-lg">{bottleLabel}</h3>
            <p className="text-xs text-on-surface-variant uppercase tracking-widest font-medium">
              Cost: {formatNaira(costPerUnit)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {tiers.map((tier) => {
          const isSelected = selectedTier === tier.key;
          const isRecommended = tier.key === "good";

          const tierColors = {
            safe: "text-success",
            good: "text-on-primary-container",
            strong: "text-secondary",
          };

          return (
            <div key={tier.key} className="relative">
              {isRecommended && (
                <div className="absolute -top-2.5 right-4 z-10 bg-primary px-2.5 py-0.5 rounded-full text-[9px] font-bold text-on-primary uppercase tracking-widest flex items-center gap-1 shadow-md border border-white/20">
                  <span
                    className="material-symbols-outlined text-[10px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                  Recommended
                </div>
              )}
              <button
                onClick={() => onSelect(tier)}
                className={`w-full h-20 rounded-xl flex items-center justify-between px-6 transition-all active:scale-[0.98] ${
                  isSelected
                    ? "bg-primary-fixed border-2 border-primary shadow-lg shadow-primary/10"
                    : "bg-white border-2 border-transparent hover:border-outline"
                }`}
              >
                <div className="flex flex-col items-start">
                  <span
                    className={`text-2xl font-bold ${
                      isSelected
                        ? tierColors[tier.key]
                        : tierColors[tier.key]
                    }`}
                  >
                    {formatNaira(tier.price)}
                  </span>
                  <span
                    className={`text-xs font-medium uppercase tracking-wider ${
                      isSelected
                        ? `${tierColors[tier.key]}/70`
                        : `${tierColors[tier.key]}/70`
                    }`}
                  >
                    {tier.label} ({tier.marginPct}% profit)
                  </span>
                </div>
                {isSelected ? (
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                ) : (
                  <span className="material-symbols-outlined text-on-surface-variant/20">
                    radio_button_unchecked
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
