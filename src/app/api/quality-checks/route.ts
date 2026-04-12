import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    purchaseId,
    colourPass,
    smellPass,
    tastePass,
    waterPass,
    result,
    note,
    photoUrl,
  } = body;

  if (!purchaseId || !result) {
    return Response.json(
      { error: "purchaseId and result are required" },
      { status: 400 }
    );
  }

  const qualityCheck = await prisma.qualityCheck.create({
    data: {
      purchaseId,
      colourPass,
      smellPass,
      tastePass,
      waterPass,
      result,
      note,
      photoUrl,
    },
  });

  // Update purchase status based on quality check result
  const statusMap: Record<string, "ACCEPTED" | "REJECTED" | "ACCEPTED_WITH_NOTE"> = {
    ACCEPT: "ACCEPTED",
    REJECT: "REJECTED",
    ACCEPT_WITH_NOTE: "ACCEPTED_WITH_NOTE",
  };

  await prisma.purchase.update({
    where: { id: purchaseId },
    data: { status: statusMap[result] || "PENDING_CHECK" },
  });

  // If accepted, ADD stock now (stock is not added at purchase time)
  if (result === "ACCEPT" || result === "ACCEPT_WITH_NOTE") {
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
    });
    if (purchase) {
      const totalLitres = purchase.kegs * purchase.kegSizeLitres;

      // Add kegs to stock
      await prisma.stockLevel.upsert({
        where: { itemType_sizeMl: { itemType: "KEG", sizeMl: 25000 } },
        update: {
          quantity: { increment: purchase.kegs },
          totalLitres: { increment: totalLitres },
          totalValue: { increment: purchase.totalCost },
        },
        create: {
          itemType: "KEG",
          sizeMl: 25000,
          quantity: purchase.kegs,
          totalLitres,
          totalValue: purchase.totalCost,
        },
      });

      // Track physical keg containers
      await prisma.kegAsset.upsert({
        where: { id: "singleton" },
        update: {
          totalKegs: { increment: purchase.kegs },
          fullKegs: { increment: purchase.kegs },
        },
        create: {
          id: "singleton",
          totalKegs: purchase.kegs,
          fullKegs: purchase.kegs,
          emptyKegs: 0,
          kegUnitCost: purchase.pricePerKeg,
          totalValue: purchase.kegs * purchase.pricePerKeg,
        },
      });
    }
  }

  return Response.json(qualityCheck, { status: 201 });
}
