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
    purchaseId: string | null;
    kegsOpened: number;
    litresAvailable: number;
    litresPacked: number;
    litresDifference: number;
    costPerLitre: number;
    bottles: BottlePayload[];
  };

  if (!kegsOpened || !bottles || bottles.length === 0) {
    return Response.json(
      { error: "kegsOpened and bottles are required" },
      { status: 400 }
    );
  }

  // If purchaseId is provided, verify it exists and is accepted
  if (purchaseId) {
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
  }

  // Determine cost per keg for stock value decrement
  // When packing from pooled stock (no purchaseId), use average from stock
  let costPerKeg = 0;
  if (purchaseId) {
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
    });
    costPerKeg = purchase?.pricePerKeg ?? 0;
  } else {
    const kegStock = await prisma.stockLevel.findFirst({
      where: { itemType: "KEG", sizeMl: 25000 },
    });
    costPerKeg =
      kegStock && kegStock.quantity > 0
        ? kegStock.totalValue / kegStock.quantity
        : 0;
  }

  // Create packing session with packed products in a transaction
  const session = await prisma.$transaction(async (tx) => {
    // 1. Create the PackingSession
    const packingSession = await tx.packingSession.create({
      data: {
        purchaseId: purchaseId || null,
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
        totalValue: { decrement: kegsOpened * costPerKeg },
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

    // 5. Update KegAsset: full kegs opened become empty kegs
    await tx.kegAsset.upsert({
      where: { id: "singleton" },
      update: {
        fullKegs: { decrement: kegsOpened },
        emptyKegs: { increment: kegsOpened },
      },
      create: {
        id: "singleton",
        totalKegs: 0,
        fullKegs: 0,
        emptyKegs: kegsOpened,
        kegUnitCost: 0,
        totalValue: 0,
      },
    });

    return packingSession;
  });

  return Response.json(session, { status: 201 });
}
