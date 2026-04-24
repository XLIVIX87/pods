import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/session";
import { writeAudit } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
) {
  const { saleId } = await params;

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      customer: true,
      items: true,
      payments: true,
    },
  });

  if (!sale) {
    return Response.json({ error: "Sale not found" }, { status: 404 });
  }

  return Response.json(sale);
}

/**
 * PATCH — edit only fields that have no stock impact.
 * Changing items/amounts is explicitly unsupported here: void and recreate.
 */
const PATCHABLE_FIELDS = [
  "customerId",
  "deliveryMethod",
  "driverName",
  "deliveryCost",
  "complaint",
  "complaintText",
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
) {
  const actor = await getActor();
  if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { saleId } = await params;
  const body = await request.json();

  const existing = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { customer: true },
  });
  if (!existing)
    return Response.json({ error: "Sale not found" }, { status: 404 });
  if (existing.voidedAt)
    return Response.json(
      { error: "Cannot edit a voided sale" },
      { status: 400 }
    );

  const data: Record<string, unknown> = {};
  for (const key of PATCHABLE_FIELDS) {
    if (key in body) data[key] = body[key];
  }

  // Recompute totalAmount if deliveryCost changed (since products don't change)
  if ("deliveryCost" in data) {
    const productTotal = existing.totalAmount - existing.deliveryCost;
    const newDelivery = Number(data.deliveryCost) || 0;
    data.totalAmount = productTotal + newDelivery;
    data.profit = (productTotal + newDelivery) - existing.totalCost;
    data.marginPct =
      data.totalAmount && Number(data.totalAmount) > 0
        ? ((data.profit as number) / Number(data.totalAmount)) * 100
        : 0;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.sale.update({
      where: { id: saleId },
      data,
      include: { customer: true, items: true, payments: true },
    });
    await writeAudit(tx, {
      actor,
      entityType: "Sale",
      entityId: saleId,
      action: "UPDATE",
      before: snapshotSale(existing),
      after: snapshotSale(next),
      reason: body.reason ?? null,
    });
    return next;
  });

  return Response.json(updated);
}

/**
 * DELETE — void (soft-delete) the sale.
 * - Sets voidedAt + voidReason
 * - Reverses every stock decrement (re-increments quantity/totalLitres/totalValue)
 * - Re-increments KegAsset for any 25L items
 * - Writes an audit entry with the full before-snapshot
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
) {
  const actor = await getActor();
  if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { saleId } = await params;
  const { reason } = await request.json().catch(() => ({ reason: null }));

  const existing = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { customer: true, items: true, payments: true },
  });
  if (!existing)
    return Response.json({ error: "Sale not found" }, { status: 404 });
  if (existing.voidedAt)
    return Response.json({ error: "Sale already voided" }, { status: 400 });

  await prisma.$transaction(async (tx) => {
    // Mark voided
    await tx.sale.update({
      where: { id: saleId },
      data: {
        voidedAt: new Date(),
        voidReason: reason ?? null,
      },
    });

    // Reverse stock for each item. We trust the stored SaleItem records — they
    // captured bottleSizeMl + quantity at sale time. The cost that was
    // decremented was `costPerUnit * quantity`, which we can reconstruct:
    // the saleItem stores lineTotal (revenue) but we need cost. Fall back to
    // the sale's implied average cost per item: totalCost / sum(quantity).
    const totalQty = existing.items.reduce((s, i) => s + i.quantity, 0);
    const avgCostPerUnit =
      totalQty > 0 ? existing.totalCost / totalQty : 0;

    for (const item of existing.items) {
      const itemType = item.bottleSizeMl === 25000 ? "KEG" : "BOTTLE";
      const litresForItem = (item.bottleSizeMl / 1000) * item.quantity;
      const valueForItem = avgCostPerUnit * item.quantity;

      await tx.stockLevel.upsert({
        where: {
          itemType_sizeMl: { itemType, sizeMl: item.bottleSizeMl },
        },
        update: {
          quantity: { increment: item.quantity },
          totalLitres: { increment: litresForItem },
          totalValue: { increment: valueForItem },
        },
        create: {
          itemType,
          sizeMl: item.bottleSizeMl,
          quantity: item.quantity,
          totalLitres: litresForItem,
          totalValue: valueForItem,
        },
      });

      if (itemType === "KEG") {
        await tx.kegAsset.update({
          where: { id: "singleton" },
          data: {
            fullKegs: { increment: item.quantity },
            totalKegs: { increment: item.quantity },
          },
        });
      }
    }

    await writeAudit(tx, {
      actor,
      entityType: "Sale",
      entityId: saleId,
      action: "VOID",
      before: snapshotSale(existing),
      reason: reason ?? null,
    });
  });

  return Response.json({ ok: true });
}

function snapshotSale(s: {
  id: string;
  customerId: string;
  totalAmount: number;
  totalCost: number;
  profit: number;
  marginPct: number;
  deliveryCost: number;
  deliveryMethod: string;
  complaint: boolean;
  complaintText: string | null;
  date: Date;
  voidedAt?: Date | null;
  voidReason?: string | null;
}) {
  return {
    id: s.id,
    customerId: s.customerId,
    totalAmount: s.totalAmount,
    totalCost: s.totalCost,
    profit: s.profit,
    marginPct: s.marginPct,
    deliveryCost: s.deliveryCost,
    deliveryMethod: s.deliveryMethod,
    complaint: s.complaint,
    complaintText: s.complaintText,
    date: s.date.toISOString(),
    voidedAt: s.voidedAt?.toISOString() ?? null,
    voidReason: s.voidReason ?? null,
  };
}
