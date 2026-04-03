import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

interface BottlePayload {
  bottleSizeMl: number;
  quantity: number;
  costPerUnit: number;
  selectedPriceTier: string | null;
  sellPrice: number;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    purchaseId,
    kegsOpened,
    litresAvailable,
    litresPacked,
    litresDifference,
    costPerLitre,
    bottles,
  } = body as {
    purchaseId: string;
    kegsOpened: number;
    litresAvailable: number;
    litresPacked: number;
    litresDifference: number;
    costPerLitre: number;
    bottles: BottlePayload[];
  };

  if (!purchaseId || !kegsOpened || !bottles || bottles.length === 0) {
    return Response.json(
      { error: "purchaseId, kegsOpened, and bottles are required" },
      { status: 400 }
    );
  }

  // Verify the purchase exists and is accepted
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
  });

  if (!purchase) {
    return Response.json({ error: "Purchase not found" }, { status: 404 });
  }

  if (
    purchase.status !== "ACCEPTED" &&
    purchase.status !== "ACCEPTED_WITH_NOTE"
  ) {
    return Response.json(
      { error: "Purchase has not been accepted" },
      { status: 400 }
    );
  }

  // Create packing session with packed products in a transaction
  const session = await prisma.$transaction(async (tx) => {
    // 1. Create the PackingSession
    const packingSession = await tx.packingSession.create({
      data: {
        purchaseId,
        kegsOpened,
        litresAvailable,
        litresPacked,
        litresDifference,
        packedProducts: {
          create: bottles.map((b: BottlePayload) => ({
            bottleSizeMl: b.bottleSizeMl,
            quantity: b.quantity,
            costPerUnit: b.costPerUnit,
            selectedPriceTier: b.selectedPriceTier,
            sellPrice: b.sellPrice,
          })),
        },
      },
      include: { packedProducts: true },
    });

    // 2. Update BottlePricing for each bottle size
    for (const b of bottles) {
      const litresPerBottle = b.bottleSizeMl / 1000;
      const oilCost = costPerLitre * litresPerBottle;

      await tx.bottlePricing.upsert({
        where: { bottleSizeMl: b.bottleSizeMl },
        update: {
          currentCostPerUnit: b.costPerUnit,
          selectedPrice: b.sellPrice,
          ...(b.selectedPriceTier === "safe" && { safePrice: b.sellPrice }),
          ...(b.selectedPriceTier === "good" && { goodPrice: b.sellPrice }),
          ...(b.selectedPriceTier === "strong" && {
            strongPrice: b.sellPrice,
          }),
        },
        create: {
          bottleSizeMl: b.bottleSizeMl,
          containerCost: b.costPerUnit - oilCost,
          currentCostPerUnit: b.costPerUnit,
          safePrice: b.selectedPriceTier === "safe" ? b.sellPrice : 0,
          goodPrice: b.selectedPriceTier === "good" ? b.sellPrice : 0,
          strongPrice: b.selectedPriceTier === "strong" ? b.sellPrice : 0,
          selectedPrice: b.sellPrice,
        },
      });
    }

    // 3. Decrement keg stock
    await tx.stockLevel.upsert({
      where: { itemType_sizeMl: { itemType: "KEG", sizeMl: 25000 } },
      update: {
        quantity: { decrement: kegsOpened },
        totalLitres: { decrement: litresAvailable },
        totalValue: { decrement: kegsOpened * purchase.pricePerKeg },
      },
      create: {
        itemType: "KEG",
        sizeMl: 25000,
        quantity: 0,
        totalLitres: 0,
        totalValue: 0,
      },
    });

    // 4. Increment bottle stock for each size
    for (const b of bottles) {
      const litresForSize = (b.bottleSizeMl / 1000) * b.quantity;
      const valueForSize = b.sellPrice * b.quantity;

      await tx.stockLevel.upsert({
        where: {
          itemType_sizeMl: { itemType: "BOTTLE", sizeMl: b.bottleSizeMl },
        },
        update: {
          quantity: { increment: b.quantity },
          totalLitres: { increment: litresForSize },
          totalValue: { increment: valueForSize },
        },
        create: {
          itemType: "BOTTLE",
          sizeMl: b.bottleSizeMl,
          quantity: b.quantity,
          totalLitres: litresForSize,
          totalValue: valueForSize,
        },
      });
    }

    return packingSession;
  });

  return Response.json(session, { status: 201 });
}
