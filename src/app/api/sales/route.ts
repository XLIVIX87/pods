import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sales = await prisma.sale.findMany({
    orderBy: { date: "desc" },
    include: {
      customer: true,
      items: true,
      payments: true,
    },
    take: 50,
  });

  return Response.json(sales);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    customerId,
    deliveryMethod = "PICKUP",
    deliveryCost = 0,
    complaint = false,
    complaintText = null,
    items,
  } = body;

  if (!customerId || !items || items.length === 0) {
    return Response.json(
      { error: "customerId and at least one item are required" },
      { status: 400 }
    );
  }

  // Calculate totals from items
  let productTotal = 0;
  let totalCost = 0;

  const saleItems: {
    bottleSizeMl: number;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[] = [];

  for (const item of items) {
    const { bottleSizeMl, quantity, unitPrice, costPerUnit } = item;
    const lineTotal = unitPrice * quantity;
    const lineCost = costPerUnit * quantity;
    productTotal += lineTotal;
    totalCost += lineCost;
    saleItems.push({ bottleSizeMl, quantity, unitPrice, lineTotal });
  }

  // Customer pays products + delivery; delivery is revenue (not cost)
  const totalAmount = productTotal + deliveryCost;
  const profit = totalAmount - totalCost;
  const marginPct = totalAmount > 0 ? (profit / totalAmount) * 100 : 0;

  const sale = await prisma.sale.create({
    data: {
      customerId,
      deliveryMethod,
      deliveryCost,
      totalAmount,
      totalCost,
      profit,
      marginPct,
      complaint,
      complaintText,
      items: {
        create: saleItems,
      },
    },
    include: {
      customer: true,
      items: true,
    },
  });

  // Update stock levels: KEG for 25L, BOTTLE for everything else
  for (const item of items) {
    const itemType = item.bottleSizeMl === 25000 ? "KEG" : "BOTTLE";
    const litresForItem = (item.bottleSizeMl / 1000) * item.quantity;
    const valueForItem = item.costPerUnit * item.quantity;

    await prisma.stockLevel.upsert({
      where: {
        itemType_sizeMl: { itemType, sizeMl: item.bottleSizeMl },
      },
      update: {
        quantity: { decrement: item.quantity },
        totalLitres: { decrement: litresForItem },
        totalValue: { decrement: valueForItem },
      },
      create: {
        itemType,
        sizeMl: item.bottleSizeMl,
        quantity: 0,
        totalLitres: 0,
        totalValue: 0,
      },
    });
  }

  // Update customer type to RETURNING
  await prisma.customer.update({
    where: { id: customerId },
    data: { customerType: "RETURNING" },
  });

  return Response.json(sale, { status: 201 });
}
