export const dynamic = "force-dynamic";

import Link from "next/link";
import BottomNav from "@/components/layout/BottomNav";
import TopBar from "@/components/layout/TopBar";
import { prisma } from "@/lib/prisma";
import PurchaseListClient, { type PurchaseRow } from "./PurchaseListClient";

async function getPurchasesData(): Promise<PurchaseRow[]> {
  const purchases = await prisma.purchase.findMany({
    include: { supplier: true },
    orderBy: { date: "desc" },
  });

  return purchases.map((p) => ({
    id: p.id,
    date: p.date.toISOString(),
    supplierName: p.supplier.name,
    supplierLocation: p.supplier.location,
    kegs: p.kegs,
    totalCost: p.totalCost,
    costPerLitre: p.costPerLitre,
    status: p.status,
  }));
}

export default async function PurchasesPage() {
  const purchases = await getPurchasesData();
  const total = purchases.length;
  const pending = purchases.filter((p) => p.status === "PENDING_CHECK").length;

  return (
    <div className="min-h-dvh pb-32">
      <TopBar variant="page" title="Purchases" />

      <div className="px-6 flex items-center gap-3 mt-1 mb-4">
        <span className="bg-primary-fixed text-on-primary-fixed text-xs font-bold px-2.5 py-1 rounded-full font-label">
          {total} total
        </span>
        {pending > 0 && (
          <span className="bg-tertiary-fixed text-on-tertiary-fixed text-xs font-bold px-2.5 py-1 rounded-full font-label">
            {pending} pending check
          </span>
        )}
      </div>

      <main className="px-6">
        <PurchaseListClient purchases={purchases} />

        <div className="mt-8">
          <Link
            href="/buy"
            className="flex items-center justify-center gap-2 bg-primary text-on-primary py-4 rounded-xl font-bold active:scale-[0.98] transition-transform shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined">add_shopping_cart</span>
            New Purchase
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
