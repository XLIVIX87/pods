import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");

  const customers = await prisma.customer.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { location: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
    include: {
      sales: {
        orderBy: { date: "desc" },
        take: 1,
        include: {
          items: true,
          payments: true,
        },
      },
      _count: { select: { sales: true } },
    },
    take: 50,
  });

  return Response.json(customers);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, phone, location } = body;

  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const customer = await prisma.customer.create({
    data: {
      name,
      phone: phone || null,
      location: location || null,
      customerType: "NEW",
    },
  });

  return Response.json(customer, { status: 201 });
}
