import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { purchases: true } },
    },
  });
  return Response.json(suppliers);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, location, phone } = body;

  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const supplier = await prisma.supplier.create({
    data: { name, location, phone },
  });

  return Response.json(supplier, { status: 201 });
}
