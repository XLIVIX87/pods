import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/session";
import { writeAudit } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { supplier: true, qualityCheck: true },
  });
  if (!purchase)
    return Response.json({ error: "Purchase not found" }, { status: 404 });
  return Response.json(purchase);
}

const EDITABLE_STAGES = ["IN_TRANSIT", "PENDING_CHECK"] as const;

/**
 * PATCH — edit before the quality check accepts stock. Once ACCEPTED, edits
 * to kegs/price/etc. would require re-playing stock & KegAsset; that's more
 * complex and deferred. Block such edits for now.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getActor();
  if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.purchase.findUnique({
    where: { id },
    include: { supplier: true },
  });
  if (!existing)
    return Response.json({ error: "Purchase not found" }, { status: 404 });

  if (
    !EDITABLE_STAGES.includes(
      existing.status as (typeof EDITABLE_STAGES)[number]
    )
  ) {
    return Response.json(
      {
        error:
          "Can only edit purchases while IN_TRANSIT or PENDING_CHECK. Void and recreate instead.",
      },
      { status: 400 }
    );
  }

  const fields: Record<string, unknown> = {};
  const allowed = [
    "supplierId",
    "kegs",
    "kegSizeLitres",
    "pricePerKeg",
    "transportCost",
  ] as const;
  for (const key of allowed) {
    if (key in body) fields[key] = body[key];
  }

  // Recompute derived fields from the merged values
  const merged = {
    kegs: (fields.kegs as number) ?? existing.kegs,
    kegSizeLitres: (fields.kegSizeLitres as number) ?? existing.kegSizeLitres,
    pricePerKeg: (fields.pricePerKeg as number) ?? existing.pricePerKeg,
    transportCost: (fields.transportCost as number) ?? existing.transportCost,
  };
  const totalCost =
    merged.kegs * merged.pricePerKeg + merged.transportCost;
  const totalLitres = merged.kegs * merged.kegSizeLitres;
  const costPerLitre = totalLitres > 0 ? totalCost / totalLitres : 0;
  fields.totalCost = totalCost;
  fields.costPerLitre = costPerLitre;

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.purchase.update({
      where: { id },
      data: fields,
      include: { supplier: true },
    });
    await writeAudit(tx, {
      actor,
      entityType: "Purchase",
      entityId: id,
      action: "UPDATE",
      before: snapshotPurchase(existing),
      after: snapshotPurchase(next),
      reason: body.reason ?? null,
    });
    return next;
  });

  return Response.json(updated);
}

/**
 * DELETE — hard delete for IN_TRANSIT / PENDING_CHECK purchases (no stock impact).
 * For ACCEPTED / ACCEPTED_WITH_NOTE purchases: reverse KEG StockLevel + KegAsset,
 * then delete. REJECTED purchases never added stock, so just delete.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getActor();
  if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { reason } = await request.json().catch(() => ({ reason: null }));

  const existing = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      qualityCheck: true,
      packingSessions: true,
      sales: true,
    },
  });
  if (!existing)
    return Response.json({ error: "Purchase not found" }, { status: 404 });

  if (existing.packingSessions.length > 0) {
    return Response.json(
      {
        error:
          "Purchase has been packed from — voiding it would orphan packing sessions. Void the packing session first.",
      },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    // Reverse stock if it was added (ACCEPTED / ACCEPTED_WITH_NOTE)
    if (
      existing.status === "ACCEPTED" ||
      existing.status === "ACCEPTED_WITH_NOTE"
    ) {
      const totalLitres = existing.kegs * existing.kegSizeLitres;
      await tx.stockLevel.update({
        where: { itemType_sizeMl: { itemType: "KEG", sizeMl: 25000 } },
        data: {
          quantity: { decrement: existing.kegs },
          totalLitres: { decrement: totalLitres },
          totalValue: { decrement: existing.totalCost },
        },
      });
      await tx.kegAsset.update({
        where: { id: "singleton" },
        data: {
          totalKegs: { decrement: existing.kegs },
          fullKegs: { decrement: existing.kegs },
        },
      });
    }

    // Delete dependent quality check first (FK)
    if (existing.qualityCheck) {
      await tx.qualityCheck.delete({
        where: { purchaseId: id },
      });
    }

    await tx.purchase.delete({ where: { id } });

    await writeAudit(tx, {
      actor,
      entityType: "Purchase",
      entityId: id,
      action: existing.status === "ACCEPTED" ||
        existing.status === "ACCEPTED_WITH_NOTE"
        ? "VOID"
        : "DELETE",
      before: snapshotPurchase(existing),
      reason: reason ?? null,
    });
  });

  return Response.json({ ok: true });
}

function snapshotPurchase(p: {
  id: string;
  supplierId: string;
  kegs: number;
  kegSizeLitres: number;
  pricePerKeg: number;
  transportCost: number;
  totalCost: number;
  costPerLitre: number;
  status: string;
  date: Date;
  receivedAt?: Date | null;
}) {
  return {
    id: p.id,
    supplierId: p.supplierId,
    kegs: p.kegs,
    kegSizeLitres: p.kegSizeLitres,
    pricePerKeg: p.pricePerKeg,
    transportCost: p.transportCost,
    totalCost: p.totalCost,
    costPerLitre: p.costPerLitre,
    status: p.status,
    date: p.date.toISOString(),
    receivedAt: p.receivedAt?.toISOString() ?? null,
  };
}
