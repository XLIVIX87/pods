import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const purchases = await prisma.purchase.findMany({
    orderBy: { date: "desc" },
    include: {
      supplier: true,
      qualityCheck: true,
    },
    take: 50,
  });
  return Response.json(purchases);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    supplierId,
    kegs,
    kegSizeLitres = 25,
    pricePerKeg,
    transportCost = 0,
    photoUrl,
    waybillPhotoUrl,
  } = body;

  if (!supplierId || !kegs || !pricePerKeg) {
    return Response.json(
      { error: "supplierId, kegs, and pricePerKeg are required" },
      { status: 400 }
    );
  }

  const totalCost = kegs * pricePerKeg + transportCost;
  const totalLitres = kegs * kegSizeLitres;
  const costPerLitre = totalLitres > 0 ? totalCost / totalLitres : 0;

  const purchase = await prisma.purchase.create({
    data: {
      supplierId,
      kegs,
      kegSizeLitres,
      pricePerKeg,
      transportCost,
      totalCost,
      costPerLitre,
      photoUrl,
      waybillPhotoUrl,
      status: "PENDING_CHECK",
    },
    include: { supplier: true },
  });

  // Update keg stock
  await prisma.stockLevel.upsert({
    where: { itemType_sizeMl: { itemType: "KEG", sizeMl: 25000 } },
    update: {
      quantity: { increment: kegs },
      totalLitres: { increment: totalLitres },
      totalValue: { increment: totalCost },
    },
    create: {
      itemType: "KEG",
      sizeMl: 25000,
      quantity: kegs,
      totalLitres,
      totalValue: totalCost,
    },
  });

  return Response.json(purchase, { status: 201 });
}
