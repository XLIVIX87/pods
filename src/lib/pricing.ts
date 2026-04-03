/**
 * PODS Smart Pricing Engine
 *
 * Calculates three price tiers for each bottle size:
 * - SAFE: 5% profit margin
 * - GOOD: 10% profit margin (recommended)
 * - STRONG: 15-20% profit margin
 */

export interface PriceTier {
  label: string;
  key: "safe" | "good" | "strong";
  marginPct: number;
  price: number;
  profit: number;
}

export interface BottlePriceCalculation {
  bottleSizeMl: number;
  costPerUnit: number;
  containerCost: number;
  totalCostPerUnit: number;
  tiers: PriceTier[];
}

// Default container costs per bottle size (in Naira)
export const DEFAULT_CONTAINER_COSTS: Record<number, number> = {
  750: 50,
  1000: 60,
  2000: 80,
  3000: 100,
  4000: 120,
  5000: 150,
};

const TIER_MARGINS = {
  safe: 0.05,
  good: 0.10,
  strong: 0.20,
};

/**
 * Calculate price tiers for a given bottle size
 */
export function calculatePriceTiers(
  costPerLitre: number,
  bottleSizeMl: number,
  containerCost?: number
): BottlePriceCalculation {
  const litres = bottleSizeMl / 1000;
  const oilCost = costPerLitre * litres;
  const container = containerCost ?? DEFAULT_CONTAINER_COSTS[bottleSizeMl] ?? 0;
  const totalCostPerUnit = oilCost + container;

  const tiers: PriceTier[] = [
    {
      label: "Safe",
      key: "safe",
      marginPct: TIER_MARGINS.safe * 100,
      price: Math.ceil(totalCostPerUnit * (1 + TIER_MARGINS.safe)),
      profit: Math.ceil(totalCostPerUnit * TIER_MARGINS.safe),
    },
    {
      label: "Good",
      key: "good",
      marginPct: TIER_MARGINS.good * 100,
      price: Math.ceil(totalCostPerUnit * (1 + TIER_MARGINS.good)),
      profit: Math.ceil(totalCostPerUnit * TIER_MARGINS.good),
    },
    {
      label: "Strong",
      key: "strong",
      marginPct: TIER_MARGINS.strong * 100,
      price: Math.ceil(totalCostPerUnit * (1 + TIER_MARGINS.strong)),
      profit: Math.ceil(totalCostPerUnit * TIER_MARGINS.strong),
    },
  ];

  return {
    bottleSizeMl,
    costPerUnit: oilCost,
    containerCost: container,
    totalCostPerUnit,
    tiers,
  };
}

/**
 * Calculate profit for a sale
 */
export function calculateSaleProfit(
  sellPrice: number,
  costPerUnit: number,
  quantity: number
): { profit: number; marginPct: number } {
  const totalRevenue = sellPrice * quantity;
  const totalCost = costPerUnit * quantity;
  const profit = totalRevenue - totalCost;
  const marginPct = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
  return { profit, marginPct };
}
