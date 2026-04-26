import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

/**
 * REAL CYFOODS LEDGER — purchases only (no sales yet).
 *
 * Source: Mary's WhatsApp ledger, parsed and reconciled.
 * Assumptions baked in (also documented in /data/cyfoods-ledger.xlsx):
 *   • 2026-02-10: stated "47k per keg" but stated total of 315k implies 45k.
 *     We trusted the total — kegPrice = 45,000.
 *   • 2026-02-16: logistics 4k/keg (only 20-keg load on record).
 *   • 2026-03-19: logistics 6k/keg (assumed applied to the most recent
 *     10-keg load, since two 10-keg loads exist and only one logistics
 *     line for "10 rubbers").
 *   • Suppliers without a name in the source are grouped under
 *     "Tomike from Ondo" — Mary should rename later.
 *   • All purchases are marked ACCEPTED with a passing quality check, since
 *     they happened in the past and the kegs are physically on hand.
 */

const PURCHASES = [
  // date           supplier             kegs price/keg logistics/keg
  { date: "2026-01-19", supplier: "Tomike from Ondo", kegs: 5,  pricePerKeg: 60_000, logisticsPerKeg: 0 },
  { date: "2026-02-10", supplier: "Tomike from Ondo", kegs: 7,  pricePerKeg: 45_000, logisticsPerKeg: 0 },
  { date: "2026-02-11", supplier: "Tomike from Ondo", kegs: 10, pricePerKeg: 48_000, logisticsPerKeg: 0 },
  { date: "2026-02-16", supplier: "Tomike from Ondo", kegs: 20, pricePerKeg: 41_500, logisticsPerKeg: 4_000 },
  { date: "2026-03-17", supplier: "Daniela PNC Tropical Foods",          kegs: 5,  pricePerKeg: 50_500, logisticsPerKeg: 0 },
  { date: "2026-03-19", supplier: "Daniela PNC Tropical Foods",          kegs: 10, pricePerKeg: 41_500, logisticsPerKeg: 6_000 },
] as const;

const KEG_SIZE_LITRES = 25;

async function main() {
  console.log("Resetting transactional data and seeding real ledger...");

  // ============ NUKE TRANSACTIONAL DATA ============
  // Order matters: respect FKs. Audit log has FK to users — keep it.
  // We are intentionally clearing everything except User accounts.
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.packedProduct.deleteMany();
  await prisma.packingSession.deleteMany();
  await prisma.qualityCheck.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.kegAsset.deleteMany();
  await prisma.bottlePricing.deleteMany();
  await prisma.supplierPriceQuote.deleteMany();
  await prisma.marketPrice.deleteMany();

  // ============ USERS ============
  const operatorPw = await bcrypt.hash("pods1234", 10);
  const investorPw = await bcrypt.hash("investor1234", 10);
  const adminPw = await bcrypt.hash("admin1234", 10);

  await prisma.user.upsert({
    where: { phone: "08012345678" },
    update: { password: operatorPw, role: "OPERATOR" },
    create: {
      name: "CYFoods Operator",
      phone: "08012345678",
      password: operatorPw,
      role: "OPERATOR",
    },
  });
  await prisma.user.upsert({
    where: { email: "investor@cyfoods.com" },
    update: { password: investorPw, role: "INVESTOR" },
    create: {
      name: "CYFoods Investor",
      email: "investor@cyfoods.com",
      password: investorPw,
      role: "INVESTOR",
    },
  });
  await prisma.user.upsert({
    where: { email: "admin@cyfoods.com" },
    update: { password: adminPw, role: "ADMIN" },
    create: {
      name: "CYFoods Admin",
      phone: "08099999999",
      email: "admin@cyfoods.com",
      password: adminPw,
      role: "ADMIN",
    },
  });

  // ============ SUPPLIERS ============
  const supplierNames = Array.from(
    new Set(PURCHASES.map((p) => p.supplier))
  );
  const supplierMap = new Map<string, string>();
  for (const name of supplierNames) {
    const supplier = await prisma.supplier.create({
      data: { name },
    });
    supplierMap.set(name, supplier.id);
  }

  // ============ PURCHASES (ACCEPTED) ============
  // We replay each purchase as ACCEPTED — quality check passed, stock added.
  let totalKegs = 0;
  let totalLitres = 0;
  let totalValue = 0;

  for (const p of PURCHASES) {
    const transportCost = p.kegs * p.logisticsPerKeg;
    const totalCost = p.kegs * p.pricePerKeg + transportCost;
    const litres = p.kegs * KEG_SIZE_LITRES;
    const costPerLitre = litres > 0 ? totalCost / litres : 0;

    const purchase = await prisma.purchase.create({
      data: {
        supplierId: supplierMap.get(p.supplier)!,
        date: new Date(`${p.date}T09:00:00Z`),
        kegs: p.kegs,
        kegSizeLitres: KEG_SIZE_LITRES,
        pricePerKeg: p.pricePerKeg,
        transportCost,
        totalCost,
        costPerLitre,
        status: "ACCEPTED",
        receivedAt: new Date(`${p.date}T12:00:00Z`),
      },
    });

    // Mark a passing quality check on the same day so the audit trail is
    // complete and the purchase status mathches reality (kegs accepted).
    await prisma.qualityCheck.create({
      data: {
        purchaseId: purchase.id,
        colourPass: true,
        smellPass: true,
        tastePass: true,
        waterPass: true,
        result: "ACCEPT",
        note: "Backfilled from real ledger — assumed accepted on receipt.",
        checkedAt: new Date(`${p.date}T13:00:00Z`),
      },
    });

    totalKegs += p.kegs;
    totalLitres += litres;
    totalValue += totalCost;
  }

  // ============ STOCK LEVEL & KEG ASSETS ============
  // All kegs from accepted purchases are currently in stock (no sales yet).
  await prisma.stockLevel.create({
    data: {
      itemType: "KEG",
      sizeMl: 25_000,
      quantity: totalKegs,
      totalLitres,
      totalValue,
    },
  });

  // Average price per keg across all purchases (for asset valuation).
  const avgKegCost =
    PURCHASES.reduce((s, p) => s + p.pricePerKeg, 0) / PURCHASES.length;

  await prisma.kegAsset.create({
    data: {
      id: "singleton",
      totalKegs,
      fullKegs: totalKegs,
      emptyKegs: 0,
      kegUnitCost: Math.round(avgKegCost),
      totalValue: Math.round(avgKegCost * totalKegs),
    },
  });

  console.log(
    `Seeded ${PURCHASES.length} real purchases — ${totalKegs} kegs (${totalLitres}L) currently in stock, total cost basis ₦${totalValue.toLocaleString()}.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
