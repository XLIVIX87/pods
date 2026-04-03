import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create default operator
  const hashedPassword = await bcrypt.hash("pods1234", 10);

  await prisma.user.upsert({
    where: { phone: "08012345678" },
    update: {},
    create: {
      name: "CYFoods Operator",
      phone: "08012345678",
      password: hashedPassword,
      role: "OPERATOR",
    },
  });

  // Create default investor
  await prisma.user.upsert({
    where: { email: "investor@cyfoods.com" },
    update: {},
    create: {
      name: "CYFoods Investor",
      email: "investor@cyfoods.com",
      password: await bcrypt.hash("investor1234", 10),
      role: "INVESTOR",
    },
  });

  // Seed suppliers
  const daniella = await prisma.supplier.upsert({
    where: { id: "supplier-daniella" },
    update: {},
    create: {
      id: "supplier-daniella",
      name: "Daniella",
      location: "Calabar",
      phone: "08034567890",
    },
  });

  const madamGrace = await prisma.supplier.upsert({
    where: { id: "supplier-madam-grace" },
    update: {},
    create: {
      id: "supplier-madam-grace",
      name: "Madam Grace",
      location: "Bayelsa",
      phone: "08045678901",
    },
  });

  // Seed bottle pricing defaults
  const bottleSizes = [
    { bottleSizeMl: 750, containerCost: 50 },
    { bottleSizeMl: 1000, containerCost: 60 },
    { bottleSizeMl: 2000, containerCost: 80 },
    { bottleSizeMl: 3000, containerCost: 100 },
    { bottleSizeMl: 4000, containerCost: 120 },
    { bottleSizeMl: 5000, containerCost: 150 },
  ];

  for (const size of bottleSizes) {
    await prisma.bottlePricing.upsert({
      where: { bottleSizeMl: size.bottleSizeMl },
      update: {},
      create: {
        bottleSizeMl: size.bottleSizeMl,
        containerCost: size.containerCost,
      },
    });
  }

  // Seed initial stock levels
  await prisma.stockLevel.upsert({
    where: { itemType_sizeMl: { itemType: "KEG", sizeMl: 25000 } },
    update: {},
    create: {
      itemType: "KEG",
      sizeMl: 25000,
      quantity: 0,
      totalLitres: 0,
      totalValue: 0,
    },
  });

  for (const size of bottleSizes) {
    await prisma.stockLevel.upsert({
      where: {
        itemType_sizeMl: { itemType: "BOTTLE", sizeMl: size.bottleSizeMl },
      },
      update: {},
      create: {
        itemType: "BOTTLE",
        sizeMl: size.bottleSizeMl,
        quantity: 0,
        totalLitres: 0,
        totalValue: 0,
      },
    });
  }

  // Seed sample customers
  await prisma.customer.upsert({
    where: { id: "customer-mama-tayo" },
    update: {},
    create: {
      id: "customer-mama-tayo",
      name: "Mama Tayo",
      phone: "08056789012",
      location: "Ajah Market",
      customerType: "RETURNING",
    },
  });

  await prisma.customer.upsert({
    where: { id: "customer-chef-ade" },
    update: {},
    create: {
      id: "customer-chef-ade",
      name: "Chef Ade",
      phone: "08067890123",
      location: "Lekki Phase 1",
      customerType: "RETURNING",
    },
  });

  await prisma.customer.upsert({
    where: { id: "customer-mrs-bola" },
    update: {},
    create: {
      id: "customer-mrs-bola",
      name: "Mrs Bola",
      phone: "08078901234",
      location: "Yaba Market",
      customerType: "RETURNING",
    },
  });

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
