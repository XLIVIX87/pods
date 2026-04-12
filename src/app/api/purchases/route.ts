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

  // Create purchase as IN_TRANSIT — stock is NOT added until quality check passes
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
      status: "IN_TRANSIT",
    },
    include: { supplier: true },
  });

  return Response.json(purchase, { status: 201 });
}
