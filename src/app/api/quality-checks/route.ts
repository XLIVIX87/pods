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

  // If rejected, reduce stock
  if (result === "REJECT") {
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
    });
    if (purchase) {
      await prisma.stockLevel.update({
        where: { itemType_sizeMl: { itemType: "KEG", sizeMl: 25000 } },
        data: {
          quantity: { decrement: purchase.kegs },
          totalLitres: { decrement: purchase.kegs * purchase.kegSizeLitres },
          totalValue: { decrement: purchase.totalCost },
        },
      });
    }
  }

  return Response.json(qualityCheck, { status: 201 });
}
