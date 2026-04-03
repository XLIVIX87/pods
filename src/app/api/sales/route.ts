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
    items,
  } = body;

  if (!customerId || !items || items.length === 0) {
    return Response.json(
      { error: "customerId and at least one item are required" },
      { status: 400 }
    );
  }

  // Calculate totals from items
  let totalAmount = 0;
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
    totalAmount += lineTotal;
    totalCost += lineCost;
    saleItems.push({ bottleSizeMl, quantity, unitPrice, lineTotal });
  }

  totalCost += deliveryCost;
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
      items: {
        create: saleItems,
      },
    },
    include: {
      customer: true,
      items: true,
    },
  });

  // Update stock levels: decrement bottle stock for each item sold
  for (const item of saleItems) {
    await prisma.stockLevel.upsert({
      where: {
        itemType_sizeMl: { itemType: "BOTTLE", sizeMl: item.bottleSizeMl },
      },
      update: {
        quantity: { decrement: item.quantity },
      },
      create: {
        itemType: "BOTTLE",
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
