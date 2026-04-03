import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const saleId = searchParams.get("saleId");

  const payments = await prisma.payment.findMany({
    where: saleId ? { saleId } : undefined,
    orderBy: { paidAt: "desc" },
    include: {
      sale: {
        include: {
          customer: true,
          items: true,
        },
      },
    },
    take: 50,
  });

  return Response.json(payments);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    saleId,
    amountPaid,
    paymentMethod = "CASH",
    expectedPaymentDate,
  } = body;

  if (!saleId || amountPaid === undefined) {
    return Response.json(
      { error: "saleId and amountPaid are required" },
      { status: 400 }
    );
  }

  // Get the sale to calculate balance
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { payments: true },
  });

  if (!sale) {
    return Response.json({ error: "Sale not found" }, { status: 404 });
  }

  // Calculate total already paid
  const alreadyPaid = sale.payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalOwed = sale.totalAmount - alreadyPaid;
  const balanceOwed = Math.max(0, totalOwed - amountPaid);

  let paymentStatus: "PAID" | "PART" | "OWED";
  if (amountPaid >= totalOwed) {
    paymentStatus = "PAID";
  } else if (amountPaid > 0) {
    paymentStatus = "PART";
  } else {
    paymentStatus = "OWED";
  }

  const payment = await prisma.payment.create({
    data: {
      saleId,
      amountPaid,
      paymentMethod,
      balanceOwed,
      paymentStatus,
      expectedPaymentDate: expectedPaymentDate
        ? new Date(expectedPaymentDate)
        : null,
    },
    include: {
      sale: {
        include: {
          customer: true,
          items: true,
        },
      },
    },
  });

  return Response.json(payment, { status: 201 });
}
