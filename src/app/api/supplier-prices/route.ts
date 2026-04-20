import { prisma } from "@/lib/prisma";

export async function GET() {
  const quotes = await prisma.supplierPriceQuote.findMany({
    include: { supplier: true },
    orderBy: { recordedAt: "desc" },
    take: 100,
  });
  return Response.json(quotes);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { supplierId, pricePerKeg, kegSizeLitres, note, recordedAt } = body;

  if (!supplierId || !pricePerKeg) {
    return Response.json(
      { error: "supplierId and pricePerKeg are required" },
      { status: 400 }
    );
  }

  const kegSize = Number(kegSizeLitres) || 25;
  const keg = Number(pricePerKeg);
  const pricePerLitre = kegSize > 0 ? keg / kegSize : 0;

  const quote = await prisma.supplierPriceQuote.create({
    data: {
      supplierId,
      pricePerKeg: keg,
      kegSizeLitres: kegSize,
      pricePerLitre,
      note: note || null,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
    },
    include: { supplier: true },
  });
  return Response.json(quote, { status: 201 });
}
