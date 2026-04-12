import { prisma } from "@/lib/prisma";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const purchase = await prisma.purchase.findUnique({ where: { id } });

  if (!purchase) {
    return Response.json({ error: "Purchase not found" }, { status: 404 });
  }

  if (purchase.status !== "IN_TRANSIT") {
    return Response.json(
      { error: `Purchase is not in transit (current status: ${purchase.status})` },
      { status: 400 }
    );
  }

  const updated = await prisma.purchase.update({
    where: { id },
    data: {
      status: "PENDING_CHECK",
      receivedAt: new Date(),
    },
    include: { supplier: true },
  });

  return Response.json(updated);
}
