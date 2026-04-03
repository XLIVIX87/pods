import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

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
