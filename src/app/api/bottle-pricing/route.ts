import { prisma } from "@/lib/prisma";

export async function GET() {
  const pricing = await prisma.bottlePricing.findMany({
    orderBy: { bottleSizeMl: "asc" },
  });
  return Response.json(pricing);
}
