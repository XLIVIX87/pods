import { prisma } from "@/lib/prisma";

export async function GET() {
  const prices = await prisma.marketPrice.findMany({
    orderBy: { recordedAt: "desc" },
    take: 100,
  });
  return Response.json(prices);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { sourceLabel, bottleSizeMl, pricePerUnit, note, recordedAt } = body;

  if (!sourceLabel || !bottleSizeMl || !pricePerUnit) {
    return Response.json(
      { error: "sourceLabel, bottleSizeMl, pricePerUnit are required" },
      { status: 400 }
    );
  }

  const size = Number(bottleSizeMl);
  const unitPrice = Number(pricePerUnit);
  const pricePerLitre = size > 0 ? unitPrice / (size / 1000) : 0;

  const entry = await prisma.marketPrice.create({
    data: {
      sourceLabel: String(sourceLabel).trim(),
      bottleSizeMl: size,
      pricePerUnit: unitPrice,
      pricePerLitre,
      note: note || null,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    },
  });
  return Response.json(entry, { status: 201 });
}
