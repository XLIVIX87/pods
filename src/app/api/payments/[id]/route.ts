import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/session";
import { writeAudit } from "@/lib/audit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getActor();
  if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { reason } = await request.json().catch(() => ({ reason: null }));

  const existing = await prisma.payment.findUnique({
    where: { id },
    include: { sale: { include: { payments: true } } },
  });
  if (!existing)
    return Response.json({ error: "Payment not found" }, { status: 404 });

  const result = await prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id } });

    await writeAudit(tx, {
      actor,
      entityType: "Payment",
      entityId: id,
      action: "DELETE",
      before: {
        id: existing.id,
        saleId: existing.saleId,
        amountPaid: existing.amountPaid,
        paymentMethod: existing.paymentMethod,
        paymentStatus: existing.paymentStatus,
        paidAt: existing.paidAt.toISOString(),
      },
      reason: reason ?? null,
    });

    // Recompute sale's new outstanding balance after deletion
    const remaining = existing.sale.payments.filter((p) => p.id !== id);
    const paid = remaining.reduce((s, p) => s + p.amountPaid, 0);
    const outstanding = Math.max(0, existing.sale.totalAmount - paid);
    return { outstanding, totalAmount: existing.sale.totalAmount, paid };
  });

  return Response.json({ ok: true, ...result });
}
