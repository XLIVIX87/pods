import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sales = await prisma.sale.findMany({
    where: { voidedAt: null },
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

  try {
    const sale = await prisma.$transaction(async (tx) => {
      // 1. Validate stock sufficiency for every item BEFORE any mutation
      for (const item of items) {
        const itemType = item.bottleSizeMl === 25000 ? "KEG" : "BOTTLE";
        const current = await tx.stockLevel.findUnique({
          where: { itemType_sizeMl: { itemType, sizeMl: item.bottleSizeMl } },
        });
        const available = current?.quantity ?? 0;
        if (available < item.quantity) {
          // Signal via typed error so the outer handler can return a 400
          throw new Error(
            `INSUFFICIENT_STOCK:${item.bottleSizeMl}:${available}:${item.quantity}`
          );
        }
      }

      // 2. Create the sale and items
      const created = await tx.sale.create({
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
          items: { create: saleItems },
        },
        include: { customer: true, items: true },
      });

      // 3. Decrement stock for each item; KEG stock items also decrement KegAsset
      for (const item of items) {
        const itemType = item.bottleSizeMl === 25000 ? "KEG" : "BOTTLE";
        const litresForItem = (item.bottleSizeMl / 1000) * item.quantity;
        const valueForItem = item.costPerUnit * item.quantity;

        await tx.stockLevel.update({
          where: {
            itemType_sizeMl: { itemType, sizeMl: item.bottleSizeMl },
          },
          data: {
            quantity: { decrement: item.quantity },
            totalLitres: { decrement: litresForItem },
            totalValue: { decrement: valueForItem },
          },
        });

        if (itemType === "KEG") {
          await tx.kegAsset.update({
            where: { id: "singleton" },
            data: {
              fullKegs: { decrement: item.quantity },
              totalKegs: { decrement: item.quantity },
            },
          });
        }
      }

      // 4. Update customer type to RETURNING
      await tx.customer.update({
        where: { id: customerId },
        data: { customerType: "RETURNING" },
      });

      return created;
    });

    return Response.json(sale, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("INSUFFICIENT_STOCK:")) {
      const [, sizeMl, available, requested] = err.message.split(":");
      return Response.json(
        {
          error: "INSUFFICIENT_STOCK",
          bottleSizeMl: Number(sizeMl),
          available: Number(available),
          requested: Number(requested),
          message: `Only ${available} in stock for size ${sizeMl}ml — you tried to sell ${requested}.`,
        },
        { status: 400 }
      );
    }
    throw err;
  }
}
