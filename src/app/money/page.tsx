export const dynamic = "force-dynamic";

import Link from "next/link";
import BottomNav from "@/components/layout/BottomNav";
import TopBar from "@/components/layout/TopBar";
import { prisma } from "@/lib/prisma";
import { formatNaira, timeAgo } from "@/lib/utils";

export default async function MoneyPage() {
  const sales = await prisma.sale.findMany({
    include: {
      customer: true,
      payments: true,
      items: true,
    },
    orderBy: { date: "desc" },
    take: 30,
  });

  const salesWithBalance = sales.map((sale) => {
    const totalPaid = sale.payments.reduce((sum, p) => sum + p.amountPaid, 0);
    const balance = sale.totalAmount - totalPaid;
    const status =
      balance <= 0 ? "PAID" : totalPaid > 0 ? "PART" : "OWED";
    return { ...sale, totalPaid, balance, status };
  });

  const unpaid = salesWithBalance.filter((s) => s.status !== "PAID");
  const paid = salesWithBalance.filter((s) => s.status === "PAID");
  const totalOwed = unpaid.reduce((sum, s) => sum + s.balance, 0);
  const totalCollected = salesWithBalance.reduce(
    (sum, s) => sum + s.totalPaid,
    0
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-success-light text-success";
      case "PART":
        return "bg-tertiary-fixed text-on-tertiary-fixed";
      case "OWED":
        return "bg-error-container text-on-error-container";
      default:
        return "bg-surface-container-high text-on-surface-variant";
    }
  };

  return (
    <div className="min-h-dvh pb-32">
      <TopBar title="Money" showBack variant="page" />

      <main className="px-6 py-4 space-y-8 max-w-xl mx-auto">
        {/* Summary Cards */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-error-container/30 p-5 rounded-xl">
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-error-container/70 mb-1">
              Owed to me
            </p>
            <p className="text-3xl font-headline font-bold text-on-error-container">
              {formatNaira(totalOwed)}
            </p>
            <p className="text-xs text-on-error-container/60 mt-1">
              {unpaid.length} unpaid sales
            </p>
          </div>
          <div className="bg-success-light p-5 rounded-xl">
            <p className="text-[10px] uppercase tracking-widest font-bold text-success/70 mb-1">
              Collected
            </p>
            <p className="text-3xl font-headline font-bold text-success">
              {formatNaira(totalCollected)}
            </p>
            <p className="text-xs text-success/60 mt-1">
              {paid.length} paid sales
            </p>
          </div>
        </section>

        {/* Unpaid Sales */}
        {unpaid.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-headline font-bold text-on-surface">
              Awaiting Payment
            </h2>
            <div className="space-y-3">
              {unpaid.map((sale) => (
                <Link
                  key={sale.id}
                  href={`/money/${sale.id}`}
                  className="block bg-surface-container-lowest p-5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] active:bg-surface-container-high transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-lg text-on-surface">
                        {sale.customer.name}
                      </p>
                      <p className="text-sm text-on-surface-variant">
                        {sale.items
                          .map(
                            (i) =>
                              `${i.quantity}x ${i.bottleSizeMl >= 1000 ? `${i.bottleSizeMl / 1000}L` : `${i.bottleSizeMl}ml`}`
                          )
                          .join(", ")}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusBadge(sale.status)}`}
                    >
                      {sale.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-on-surface-variant">
                        {timeAgo(sale.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-on-surface-variant">
                        Balance
                      </p>
                      <p className="text-xl font-bold text-error">
                        {formatNaira(sale.balance)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent Paid */}
        {paid.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-headline font-bold text-on-surface">
              Recently Paid
            </h2>
            <div className="space-y-3">
              {paid.slice(0, 5).map((sale) => (
                <Link
                  key={sale.id}
                  href={`/money/${sale.id}`}
                  className="block bg-surface-container-low p-4 rounded-xl active:bg-surface-container-high transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-on-surface">
                        {sale.customer.name}
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {timeAgo(sale.date)}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <p className="font-bold text-success">
                        {formatNaira(sale.totalAmount)}
                      </p>
                      <span className="material-symbols-outlined text-success text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {sales.length === 0 && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-4 block">
              payments
            </span>
            <p className="text-on-surface-variant text-lg">
              No sales recorded yet
            </p>
            <p className="text-on-surface-variant/60 text-sm mt-1">
              Complete a sale to start tracking payments
            </p>
            <Link
              href="/sell"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-primary text-on-primary rounded-xl font-bold"
            >
              <span className="material-symbols-outlined">sell</span>
              Make a Sale
            </Link>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
