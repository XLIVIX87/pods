import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding PODS database...");

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
      email: "admin@cyfoods.com",
      phone: "08099999999",
      password: adminPw,
      role: "ADMIN",
    },
  });

  console.log("  Users seeded");

  // ============ SUPPLIERS ============
  const daniella = await prisma.supplier.upsert({
    where: { id: "supplier-daniella" },
    update: {},
    create: {
      id: "supplier-daniella",
      name: "Daniella",
      location: "Calabar",
      phone: "08034567890",
    },
  });

  const madamGrace = await prisma.supplier.upsert({
    where: { id: "supplier-madam-grace" },
    update: {},
    create: {
      id: "supplier-madam-grace",
      name: "Madam Grace",
      location: "Bayelsa",
      phone: "08045678901",
    },
  });

  const ogaBello = await prisma.supplier.upsert({
    where: { id: "supplier-oga-bello" },
    update: {},
    create: {
      id: "supplier-oga-bello",
      name: "Oga Bello",
      location: "Akwa Ibom",
      phone: "08056789012",
    },
  });

  console.log("  Suppliers seeded");

  // ============ CUSTOMERS ============
  const mamaTayo = await prisma.customer.upsert({
    where: { id: "customer-mama-tayo" },
    update: {},
    create: {
      id: "customer-mama-tayo",
      name: "Mama Tayo",
      phone: "08056789012",
      location: "Ajah Market",
      customerType: "RETURNING",
    },
  });

  const chefAde = await prisma.customer.upsert({
    where: { id: "customer-chef-ade" },
    update: {},
    create: {
      id: "customer-chef-ade",
      name: "Chef Ade",
      phone: "08067890123",
      location: "Lekki Phase 1",
      customerType: "RETURNING",
    },
  });

  const mrsBola = await prisma.customer.upsert({
    where: { id: "customer-mrs-bola" },
    update: {},
    create: {
      id: "customer-mrs-bola",
      name: "Mrs Bola",
      phone: "08078901234",
      location: "Yaba Market",
      customerType: "RETURNING",
    },
  });

  await prisma.customer.upsert({
    where: { id: "customer-aunty-shade" },
    update: {},
    create: {
      id: "customer-aunty-shade",
      name: "Aunty Shade",
      phone: "08089012345",
      location: "Surulere",
      customerType: "NEW",
    },
  });

  await prisma.customer.upsert({
    where: { id: "customer-iya-basira" },
    update: {},
    create: {
      id: "customer-iya-basira",
      name: "Iya Basira",
      phone: "08090123456",
      location: "Mushin",
      customerType: "RETURNING",
    },
  });

  console.log("  Customers seeded");

  // ============ BOTTLE PRICING ============
  const bottleSizes = [
    { bottleSizeMl: 750, containerCost: 50 },
    { bottleSizeMl: 1000, containerCost: 60 },
    { bottleSizeMl: 2000, containerCost: 80 },
    { bottleSizeMl: 3000, containerCost: 100 },
    { bottleSizeMl: 4000, containerCost: 120 },
    { bottleSizeMl: 5000, containerCost: 150 },
  ];

  for (const size of bottleSizes) {
    await prisma.bottlePricing.upsert({
      where: { bottleSizeMl: size.bottleSizeMl },
      update: {},
      create: {
        bottleSizeMl: size.bottleSizeMl,
        containerCost: size.containerCost,
      },
    });
  }

  console.log("  Bottle pricing seeded");

  // ============ PURCHASES ============
  // Purchase 1: Daniella — ACCEPTED, 10 kegs @ 28000/keg + 5000 transport
  const purchase1 = await prisma.purchase.upsert({
    where: { id: "purchase-1" },
    update: {},
    create: {
      id: "purchase-1",
      supplierId: daniella.id,
      kegs: 10,
      kegSizeLitres: 25,
      pricePerKeg: 28000,
      transportCost: 5000,
      totalCost: 10 * 28000 + 5000,
      costPerLitre: (10 * 28000 + 5000) / (10 * 25),
      status: "ACCEPTED",
      receivedAt: new Date("2026-04-05"),
      date: new Date("2026-04-03"),
    },
  });

  // Quality check for purchase 1
  await prisma.qualityCheck.upsert({
    where: { purchaseId: purchase1.id },
    update: {},
    create: {
      purchaseId: purchase1.id,
      colourPass: true,
      smellPass: true,
      tastePass: true,
      waterPass: true,
      result: "ACCEPT",
      checkedAt: new Date("2026-04-05"),
    },
  });

  // Purchase 2: Madam Grace — ACCEPTED_WITH_NOTE, 8 kegs @ 27000/keg + 8000 transport
  const purchase2 = await prisma.purchase.upsert({
    where: { id: "purchase-2" },
    update: {},
    create: {
      id: "purchase-2",
      supplierId: madamGrace.id,
      kegs: 8,
      kegSizeLitres: 25,
      pricePerKeg: 27000,
      transportCost: 8000,
      totalCost: 8 * 27000 + 8000,
      costPerLitre: (8 * 27000 + 8000) / (8 * 25),
      status: "ACCEPTED_WITH_NOTE",
      receivedAt: new Date("2026-04-08"),
      date: new Date("2026-04-06"),
    },
  });

  await prisma.qualityCheck.upsert({
    where: { purchaseId: purchase2.id },
    update: {},
    create: {
      purchaseId: purchase2.id,
      colourPass: true,
      smellPass: true,
      tastePass: false,
      waterPass: true,
      result: "ACCEPT_WITH_NOTE",
      note: "Slightly stronger taste than usual but acceptable for cooking oil",
      checkedAt: new Date("2026-04-08"),
    },
  });

  // Purchase 3: Oga Bello — IN_TRANSIT
  await prisma.purchase.upsert({
    where: { id: "purchase-3" },
    update: {},
    create: {
      id: "purchase-3",
      supplierId: ogaBello.id,
      kegs: 12,
      kegSizeLitres: 25,
      pricePerKeg: 26500,
      transportCost: 10000,
      totalCost: 12 * 26500 + 10000,
      costPerLitre: (12 * 26500 + 10000) / (12 * 25),
      status: "IN_TRANSIT",
      date: new Date("2026-04-10"),
    },
  });

  // Purchase 4: Daniella — PENDING_CHECK (received but not checked)
  await prisma.purchase.upsert({
    where: { id: "purchase-4" },
    update: {},
    create: {
      id: "purchase-4",
      supplierId: daniella.id,
      kegs: 6,
      kegSizeLitres: 25,
      pricePerKeg: 28500,
      transportCost: 5000,
      totalCost: 6 * 28500 + 5000,
      costPerLitre: (6 * 28500 + 5000) / (6 * 25),
      status: "PENDING_CHECK",
      receivedAt: new Date("2026-04-11"),
      date: new Date("2026-04-09"),
    },
  });

  console.log("  Purchases & quality checks seeded");

  // ============ PACKING SESSIONS ============
  // Packing from purchase 1: opened 4 kegs (100L)
  const packing1 = await prisma.packingSession.upsert({
    where: { id: "packing-1" },
    update: {},
    create: {
      id: "packing-1",
      purchaseId: purchase1.id,
      kegsOpened: 4,
      litresAvailable: 100,
      litresPacked: 97.5,
      litresDifference: 2.5,
      createdAt: new Date("2026-04-06"),
    },
  });

  // Packed products from packing 1
  const costPerLitre1 = purchase1.costPerLitre;
  const packingProducts1 = [
    { bottleSizeMl: 1000, quantity: 30, tier: "good" },
    { bottleSizeMl: 2000, quantity: 15, tier: "good" },
    { bottleSizeMl: 5000, quantity: 5, tier: "strong" },
  ];

  for (const p of packingProducts1) {
    const oilCost = costPerLitre1 * (p.bottleSizeMl / 1000);
    const containerCost = bottleSizes.find((s) => s.bottleSizeMl === p.bottleSizeMl)?.containerCost ?? 0;
    const costPerUnit = oilCost + containerCost;
    const margin = p.tier === "strong" ? 1.20 : 1.10;
    const sellPrice = Math.ceil(costPerUnit * margin);

    await prisma.packedProduct.create({
      data: {
        packingSessionId: packing1.id,
        bottleSizeMl: p.bottleSizeMl,
        quantity: p.quantity,
        costPerUnit,
        selectedPriceTier: p.tier,
        sellPrice,
      },
    });

    // Update bottle pricing
    await prisma.bottlePricing.upsert({
      where: { bottleSizeMl: p.bottleSizeMl },
      update: {
        currentCostPerUnit: costPerUnit,
        selectedPrice: sellPrice,
        goodPrice: p.tier === "good" ? sellPrice : undefined,
        strongPrice: p.tier === "strong" ? sellPrice : undefined,
      },
      create: {
        bottleSizeMl: p.bottleSizeMl,
        containerCost,
        currentCostPerUnit: costPerUnit,
        selectedPrice: sellPrice,
        goodPrice: p.tier === "good" ? sellPrice : 0,
        strongPrice: p.tier === "strong" ? sellPrice : 0,
      },
    });
  }

  // Packing 2 from pooled stock: opened 3 kegs (75L)
  const packing2 = await prisma.packingSession.upsert({
    where: { id: "packing-2" },
    update: {},
    create: {
      id: "packing-2",
      purchaseId: null, // pooled stock
      kegsOpened: 3,
      litresAvailable: 75,
      litresPacked: 73,
      litresDifference: 2,
      createdAt: new Date("2026-04-09"),
    },
  });

  const avgCostPerLitre = (purchase1.totalCost + purchase2.totalCost) / ((purchase1.kegs + purchase2.kegs) * 25);
  const packingProducts2 = [
    { bottleSizeMl: 750, quantity: 20, tier: "safe" },
    { bottleSizeMl: 1000, quantity: 20, tier: "good" },
    { bottleSizeMl: 3000, quantity: 8, tier: "good" },
  ];

  for (const p of packingProducts2) {
    const oilCost = avgCostPerLitre * (p.bottleSizeMl / 1000);
    const containerCost = bottleSizes.find((s) => s.bottleSizeMl === p.bottleSizeMl)?.containerCost ?? 0;
    const costPerUnit = oilCost + containerCost;
    const margin = p.tier === "safe" ? 1.05 : p.tier === "strong" ? 1.20 : 1.10;
    const sellPrice = Math.ceil(costPerUnit * margin);

    await prisma.packedProduct.create({
      data: {
        packingSessionId: packing2.id,
        bottleSizeMl: p.bottleSizeMl,
        quantity: p.quantity,
        costPerUnit,
        selectedPriceTier: p.tier,
        sellPrice,
      },
    });

    await prisma.bottlePricing.upsert({
      where: { bottleSizeMl: p.bottleSizeMl },
      update: {
        currentCostPerUnit: costPerUnit,
        selectedPrice: sellPrice,
      },
      create: {
        bottleSizeMl: p.bottleSizeMl,
        containerCost,
        currentCostPerUnit: costPerUnit,
        selectedPrice: sellPrice,
      },
    });
  }

  console.log("  Packing sessions seeded");

  // ============ STOCK LEVELS ============
  // Accepted purchases: 10 kegs (P1) + 8 kegs (P2) = 18 kegs total
  // Packed: 4 kegs (packing1) + 3 kegs (packing2) = 7 kegs opened
  // Remaining kegs: 18 - 7 = 11
  const remainingKegs = 11;
  const totalKegLitres = remainingKegs * 25;
  // Weighted average cost for remaining kegs
  const totalPurchaseCost = purchase1.totalCost + purchase2.totalCost;
  const totalPurchaseKegs = purchase1.kegs + purchase2.kegs;
  const avgCostPerKeg = totalPurchaseCost / totalPurchaseKegs;
  const remainingKegValue = remainingKegs * avgCostPerKeg;

  await prisma.stockLevel.upsert({
    where: { itemType_sizeMl: { itemType: "KEG", sizeMl: 25000 } },
    update: {
      quantity: remainingKegs,
      totalLitres: totalKegLitres,
      totalValue: remainingKegValue,
    },
    create: {
      itemType: "KEG",
      sizeMl: 25000,
      quantity: remainingKegs,
      totalLitres: totalKegLitres,
      totalValue: remainingKegValue,
    },
  });

  // Bottle stock: packed quantities minus some sold (we'll create sales next)
  // Packing1: 30x1L, 15x2L, 5x5L
  // Packing2: 20x750ml, 20x1L, 8x3L
  // We'll sell some below, so set full packed stock first, then sales will decrement
  const bottleStock = [
    { sizeMl: 750, quantity: 20, litres: 20 * 0.75, value: 0 },
    { sizeMl: 1000, quantity: 50, litres: 50 * 1, value: 0 },
    { sizeMl: 2000, quantity: 15, litres: 15 * 2, value: 0 },
    { sizeMl: 3000, quantity: 8, litres: 8 * 3, value: 0 },
    { sizeMl: 4000, quantity: 0, litres: 0, value: 0 },
    { sizeMl: 5000, quantity: 5, litres: 5 * 5, value: 0 },
  ];

  // Calculate values from bottle pricing
  for (const bs of bottleStock) {
    const pricing = await prisma.bottlePricing.findUnique({
      where: { bottleSizeMl: bs.sizeMl },
    });
    bs.value = bs.quantity * (pricing?.selectedPrice ?? 0);
  }

  for (const bs of bottleStock) {
    await prisma.stockLevel.upsert({
      where: { itemType_sizeMl: { itemType: "BOTTLE", sizeMl: bs.sizeMl } },
      update: {
        quantity: bs.quantity,
        totalLitres: bs.litres,
        totalValue: bs.value,
      },
      create: {
        itemType: "BOTTLE",
        sizeMl: bs.sizeMl,
        quantity: bs.quantity,
        totalLitres: bs.litres,
        totalValue: bs.value,
      },
    });
  }

  console.log("  Stock levels seeded");

  // ============ KEG ASSETS ============
  // Total kegs received: 18 (10 from P1, 8 from P2)
  // Full kegs: 11 (not yet opened)
  // Empty kegs: 7 (opened in packing)
  await prisma.kegAsset.upsert({
    where: { id: "singleton" },
    update: {
      totalKegs: 18,
      fullKegs: 11,
      emptyKegs: 7,
      kegUnitCost: avgCostPerKeg,
      totalValue: 18 * avgCostPerKeg,
    },
    create: {
      id: "singleton",
      totalKegs: 18,
      fullKegs: 11,
      emptyKegs: 7,
      kegUnitCost: avgCostPerKeg,
      totalValue: 18 * avgCostPerKeg,
    },
  });

  console.log("  Keg assets seeded");

  // ============ SALES ============
  // Get sell prices from bottle pricing
  const pricing1L = await prisma.bottlePricing.findUnique({ where: { bottleSizeMl: 1000 } });
  const pricing2L = await prisma.bottlePricing.findUnique({ where: { bottleSizeMl: 2000 } });
  const pricing750 = await prisma.bottlePricing.findUnique({ where: { bottleSizeMl: 750 } });
  const pricing3L = await prisma.bottlePricing.findUnique({ where: { bottleSizeMl: 3000 } });

  const price1L = pricing1L?.selectedPrice ?? 1400;
  const price2L = pricing2L?.selectedPrice ?? 2700;
  const price750 = pricing750?.selectedPrice ?? 1050;
  const price3L = pricing3L?.selectedPrice ?? 3900;

  const cost1L = pricing1L?.currentCostPerUnit ?? 1200;
  const cost2L = pricing2L?.currentCostPerUnit ?? 2400;
  const cost750 = pricing750?.currentCostPerUnit ?? 900;
  const cost3L = pricing3L?.currentCostPerUnit ?? 3500;

  // Sale 1: Mama Tayo — fully paid (10x1L + 5x2L, delivered)
  const sale1Items = [
    { bottleSizeMl: 1000, quantity: 10, unitPrice: price1L, lineTotal: 10 * price1L },
    { bottleSizeMl: 2000, quantity: 5, unitPrice: price2L, lineTotal: 5 * price2L },
  ];
  const sale1ProductTotal = sale1Items.reduce((s, i) => s + i.lineTotal, 0);
  const sale1DeliveryCost = 2000;
  const sale1Total = sale1ProductTotal + sale1DeliveryCost;
  const sale1Cost = 10 * cost1L + 5 * cost2L;
  const sale1Profit = sale1Total - sale1Cost;

  const sale1 = await prisma.sale.upsert({
    where: { id: "sale-1" },
    update: {},
    create: {
      id: "sale-1",
      customerId: mamaTayo.id,
      deliveryMethod: "DELIVER",
      deliveryCost: sale1DeliveryCost,
      totalAmount: sale1Total,
      totalCost: sale1Cost,
      profit: sale1Profit,
      marginPct: sale1Total > 0 ? (sale1Profit / sale1Total) * 100 : 0,
      date: new Date("2026-04-07"),
      items: { create: sale1Items },
    },
  });

  await prisma.payment.create({
    data: {
      saleId: sale1.id,
      amountPaid: sale1Total,
      paymentMethod: "TRANSFER",
      balanceOwed: 0,
      paymentStatus: "PAID",
      paidAt: new Date("2026-04-07"),
    },
  });

  // Sale 2: Chef Ade — partially paid (15x750ml + 3x3L, pickup)
  const sale2Items = [
    { bottleSizeMl: 750, quantity: 15, unitPrice: price750, lineTotal: 15 * price750 },
    { bottleSizeMl: 3000, quantity: 3, unitPrice: price3L, lineTotal: 3 * price3L },
  ];
  const sale2Total = sale2Items.reduce((s, i) => s + i.lineTotal, 0);
  const sale2Cost = 15 * cost750 + 3 * cost3L;
  const sale2Profit = sale2Total - sale2Cost;

  const sale2 = await prisma.sale.upsert({
    where: { id: "sale-2" },
    update: {},
    create: {
      id: "sale-2",
      customerId: chefAde.id,
      deliveryMethod: "PICKUP",
      totalAmount: sale2Total,
      totalCost: sale2Cost,
      profit: sale2Profit,
      marginPct: sale2Total > 0 ? (sale2Profit / sale2Total) * 100 : 0,
      date: new Date("2026-04-10"),
      items: { create: sale2Items },
    },
  });

  const partPayment = Math.round(sale2Total * 0.6);
  await prisma.payment.create({
    data: {
      saleId: sale2.id,
      amountPaid: partPayment,
      paymentMethod: "CASH",
      balanceOwed: sale2Total - partPayment,
      paymentStatus: "PART",
      paidAt: new Date("2026-04-10"),
    },
  });

  // Sale 3: Mrs Bola — unpaid (5x1L, pickup)
  const sale3Items = [
    { bottleSizeMl: 1000, quantity: 5, unitPrice: price1L, lineTotal: 5 * price1L },
  ];
  const sale3Total = sale3Items.reduce((s, i) => s + i.lineTotal, 0);
  const sale3Cost = 5 * cost1L;
  const sale3Profit = sale3Total - sale3Cost;

  await prisma.sale.upsert({
    where: { id: "sale-3" },
    update: {},
    create: {
      id: "sale-3",
      customerId: mrsBola.id,
      deliveryMethod: "PICKUP",
      totalAmount: sale3Total,
      totalCost: sale3Cost,
      profit: sale3Profit,
      marginPct: sale3Total > 0 ? (sale3Profit / sale3Total) * 100 : 0,
      date: new Date("2026-04-11"),
      items: { create: sale3Items },
    },
  });

  console.log("  Sales & payments seeded");

  // Adjust bottle stock for sold items
  // Sale 1: -10x1L, -5x2L
  // Sale 2: -15x750ml, -3x3L
  // Sale 3: -5x1L
  const soldItems = [
    { sizeMl: 1000, qty: 15 },
    { sizeMl: 2000, qty: 5 },
    { sizeMl: 750, qty: 15 },
    { sizeMl: 3000, qty: 3 },
  ];

  for (const sold of soldItems) {
    const litresDecrement = (sold.sizeMl / 1000) * sold.qty;
    const pricingRecord = await prisma.bottlePricing.findUnique({
      where: { bottleSizeMl: sold.sizeMl },
    });
    const costDecrement = (pricingRecord?.currentCostPerUnit ?? 0) * sold.qty;

    await prisma.stockLevel.update({
      where: { itemType_sizeMl: { itemType: "BOTTLE", sizeMl: sold.sizeMl } },
      data: {
        quantity: { decrement: sold.qty },
        totalLitres: { decrement: litresDecrement },
        totalValue: { decrement: costDecrement },
      },
    });
  }

  console.log("  Stock adjusted for sales");
  console.log("\nSeed completed successfully!");
  console.log("\nLogin credentials:");
  console.log("  Operator: 08012345678 / pods1234");
  console.log("  Investor: investor@cyfoods.com / investor1234");
  console.log("  Admin:    admin@cyfoods.com / admin1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
