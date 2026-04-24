import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/session";
import { writeAudit } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { _count: { select: { purchases: true } } },
  });
  if (!supplier)
    return Response.json({ error: "Supplier not found" }, { status: 404 });
  return Response.json(supplier);
}

const EDITABLE = ["name", "location", "phone"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getActor();
  if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing)
    return Response.json({ error: "Supplier not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const k of EDITABLE) {
    if (k in body) data[k] = body[k];
  }
  if (Object.keys(data).length === 0) {
    return Response.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.supplier.update({ where: { id }, data });
    await writeAudit(tx, {
      actor,
      entityType: "Supplier",
      entityId: id,
      action: "UPDATE",
      before: {
        name: existing.name,
        phone: existing.phone,
        location: existing.location,
      },
      after: {
        name: next.name,
        phone: next.phone,
        location: next.location,
      },
      reason: body.reason ?? null,
    });
    return next;
  });

  return Response.json(updated);
}
