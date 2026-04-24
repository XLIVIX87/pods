import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActor } from "@/lib/session";
import { writeAudit } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        where: { voidedAt: null },
        orderBy: { date: "desc" },
        take: 20,
        include: { items: true, payments: true },
      },
    },
  });
  if (!customer)
    return Response.json({ error: "Customer not found" }, { status: 404 });
  return Response.json(customer);
}

const EDITABLE = ["name", "phone", "location", "customerType"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getActor();
  if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing)
    return Response.json({ error: "Customer not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const k of EDITABLE) {
    if (k in body) data[k] = body[k];
  }
  if (!("name" in data) && !("phone" in data) && !("location" in data) && !("customerType" in data)) {
    return Response.json({ error: "No editable fields provided" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.customer.update({ where: { id }, data });
    await writeAudit(tx, {
      actor,
      entityType: "Customer",
      entityId: id,
      action: "UPDATE",
      before: {
        name: existing.name,
        phone: existing.phone,
        location: existing.location,
        customerType: existing.customerType,
      },
      after: {
        name: next.name,
        phone: next.phone,
        location: next.location,
        customerType: next.customerType,
      },
      reason: body.reason ?? null,
    });
    return next;
  });

  return Response.json(updated);
}
