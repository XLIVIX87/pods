/**
 * Format a number as Nigerian Naira
 */
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Parse a Naira string back to a number
 */
export function parseNaira(value: string): number {
  return Number(value.replace(/[₦,\s]/g, "")) || 0;
}

/**
 * Calculate cost per litre from purchase details
 */
export function calculateCostPerLitre(
  kegs: number,
  kegSizeLitres: number,
  pricePerKeg: number,
  transportCost: number
): number {
  const totalLitres = kegs * kegSizeLitres;
  const totalCost = kegs * pricePerKeg + transportCost;
  return totalLitres > 0 ? totalCost / totalLitres : 0;
}

/**
 * Calculate total purchase cost
 */
export function calculateTotalCost(
  kegs: number,
  pricePerKeg: number,
  transportCost: number
): number {
  return kegs * pricePerKeg + transportCost;
}

/**
 * Generate WhatsApp deep link
 */
export function whatsappLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/\D/g, "");
  const ngPhone = cleanPhone.startsWith("0")
    ? `234${cleanPhone.slice(1)}`
    : cleanPhone;
  return `https://wa.me/${ngPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(d);
}

/**
 * Bottle sizes available in the system
 */
export const BOTTLE_SIZES = [750, 1000, 2000, 3000, 4000, 5000] as const;

/**
 * Format bottle size for display
 */
export function formatBottleSize(sizeMl: number): string {
  if (sizeMl >= 1000) return `${sizeMl / 1000}L`;
  return `${sizeMl}ml`;
}

/**
 * KEG size in litres
 */
export const KEG_SIZE_LITRES = 25;
