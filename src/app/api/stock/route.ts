import { prisma } from "@/lib/prisma";

export async function GET() {
  const levels = await prisma.stockLevel.findMany();
  // Return as a flat list the client can index by sizeMl
  const items = levels.map((l) => ({
    itemType: l.itemType,
    sizeMl: l.sizeMl,
    quantity: l.quantity,
    totalLitres: l.totalLitres,
    totalValue: l.totalValue,
  }));
  return Response.json(items);
}
