export const dynamic = "force-dynamic";

import Link from "next/link";
import BottomNav from "@/components/layout/BottomNav";
import TopBar from "@/components/layout/TopBar";
import StatCard from "@/components/shared/StatCard";
import { prisma } from "@/lib/prisma";
import { formatNaira, timeAgo } from "@/lib/utils";

async function getHomeData() {
  const [kegStock, sales, owedPayments, pendingCheckCount, firstPendingCheck] = await Promise.all([
    prisma.stockLevel.findFirst({
      where: { itemType: "KEG" },
    }),
    prisma.sale.findMany({
      where: {
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      include: { customer: true, payments: true },
      orderBy: { date: "desc" },
      take: 10,
    }),
    prisma.payment.findMany({
      where: { paymentStatus: { in: ["OWED", "PART"] } },
    }),
    prisma.purchase.count({ where: { status: "PENDING_CHECK" } }),
    prisma.purchase.findFirst({
      where: { status: "PENDING_CHECK" },
      orderBy: { date: "asc" },
      select: { id: true },
    }),
  ]);

  const todaySalesTotal = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalOwed = owedPayments.reduce((sum, p) => sum + p.balanceOwed, 0);
  const kegCount = kegStock?.quantity ?? 0;

  const recentSales = await prisma.sale.findMany({
    include: { customer: true, payments: true },
    orderBy: { date: "desc" },
    take: 5,
  });

  const recentPurchases = await prisma.purchase.findMany({
    include: { supplier: true },
    orderBy: { date: "desc" },
    take: 5,
  });

  return {
    kegCount,
    todaySalesTotal,
    totalOwed,
    recentSales,
    recentPurchases,
    pendingCheckCount,
    firstPendingCheckId: firstPendingCheck?.id,
  };
}

export default async function HomePage() {
  const data = await getHomeData();

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  type Activity = {
    id: string;
    type: "sale" | "purchase";
    description: string;
    amount: number;
    date: Date;
    status: string;
    icon: string;
  };

  const activities: Activity[] = [
    ...data.recentSales.map((s) => ({
      id: s.id,
      type: "sale" as const,
      description: `Sold to ${s.customer.name}`,
      amount: s.totalAmount,
      date: s.date,
      status:
        s.payments.length > 0
          ? s.payments[s.payments.length - 1].paymentStatus
          : "OWED",
      icon: "arrow_outward",
    })),
    ...data.recentPurchases.map((p) => ({
      id: p.id,
      type: "purchase" as const,
      description: `Bought ${p.kegs} kegs from ${p.supplier.name}`,
      amount: p.totalCost,
      date: p.date,
      status: p.status,
      icon: "call_received",
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const statusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-success-light text-success";
      case "PART":
        return "bg-tertiary-fixed text-on-tertiary-fixed";
      case "OWED":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-surface-container-high text-on-surface-variant";
    }
  };

  return (
    <div className="min-h-dvh pb-32">
      <TopBar />

      <div className="px-6 mt-2">
        <p className="text-on-surface-variant font-headline italic text-xl">
          {dateStr}
        </p>
      </div>

      <main className="px-6 space-y-8 mt-4">
        {/* Quick Stats Row */}
        <section className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <StatCard
            icon="oil_barrel"
            label="Stock"
            value={`${data.kegCount} kegs`}
          />
          <StatCard
            icon="account_balance_wallet"
            label="Owed to me"
            value={formatNaira(data.totalOwed)}
            variant="gold"
          />
          <StatCard
            icon="trending_up"
            label="Sales Today"
            value={formatNaira(data.todaySalesTotal)}
            variant="green"
          />
        </section>

        {/* Pending Quality Check Alert */}
        {data.pendingCheckCount > 0 && data.firstPendingCheckId && (
          <Link
            href={`/check/${data.firstPendingCheckId}`}
            className="flex items-center gap-4 p-4 rounded-xl bg-tertiary-fixed border border-tertiary/20 active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined">fact_check</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-on-tertiary-fixed">
                {data.pendingCheckCount} purchase
                {data.pendingCheckCount > 1 ? "s" : ""} awaiting quality check
              </p>
              <p className="text-xs text-on-tertiary-fixed-variant">
                Tap to review the oldest one
              </p>
            </div>
            <span className="material-symbols-outlined text-on-tertiary-fixed-variant">
              arrow_forward
            </span>
          </Link>
        )}

        {/* Quick Action Buttons: 2x2 Bento */}
        <section className="grid grid-cols-2 gap-4">
          <Link
            href="/buy"
            className="h-44 rounded-xl bg-primary-container text-on-primary-fixed flex flex-col items-center justify-center gap-3 transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-4xl">
              shopping_cart
            </span>
            <span className="font-bold text-lg">Buy Oil</span>
          </Link>
          <Link
            href="/pack"
            className="h-44 rounded-xl bg-tertiary-container text-on-tertiary-container flex flex-col items-center justify-center gap-3 transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-4xl">
              inventory_2
            </span>
            <span className="font-bold text-lg">Pack Bottles</span>
          </Link>
          <Link
            href="/sell"
            className="h-44 rounded-xl bg-secondary-container text-on-secondary-container flex flex-col items-center justify-center gap-3 transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-4xl">sell</span>
            <span className="font-bold text-lg">Sell Oil</span>
          </Link>
          <Link
            href="/stock"
            className="h-44 rounded-xl bg-surface-container-highest text-on-surface-variant flex flex-col items-center justify-center gap-3 transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined text-4xl">
              fact_check
            </span>
            <span className="font-bold text-lg">Check Stock</span>
          </Link>
        </section>

        {/* Recent Activity */}
        <section className="space-y-4 pb-12">
          <div className="flex justify-between items-end">
            <h2 className="text-2xl font-headline font-bold italic text-on-surface">
              Recent Activity
            </h2>
            <button className="text-sm font-bold text-secondary uppercase tracking-widest">
              See All
            </button>
          </div>

          <div className="space-y-3">
            {activities.length === 0 && (
              <div className="bg-surface-container-low rounded-xl p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2 block">
                  inbox
                </span>
                <p className="text-on-surface-variant">
                  No activity yet. Start by buying some oil!
                </p>
              </div>
            )}

            {activities.map((activity) => {
              const href =
                activity.type === "sale"
                  ? `/money/${activity.id}`
                  : activity.status === "PENDING_CHECK"
                    ? `/check/${activity.id}`
                    : `/purchases/${activity.id}`;

              return (
                <Link
                  key={activity.id}
                  href={href}
                  className="bg-surface-container-low rounded-xl p-5 flex justify-between items-center transition-all active:bg-surface-container-high active:scale-[0.98]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusBadge(activity.status)}`}
                      >
                        {activity.status === "PENDING_CHECK"
                          ? "New"
                          : activity.status}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-medium">
                        {timeAgo(activity.date)}
                      </span>
                    </div>
                    <p className="text-on-surface font-medium leading-tight">
                      {activity.description}
                    </p>
                    <p className="text-xl font-bold text-on-surface">
                      {formatNaira(activity.amount)}
                    </p>
                  </div>
                  <div
                    className={`w-12 h-12 bg-surface-container-highest rounded-full flex items-center justify-center ${
                      activity.type === "sale"
                        ? "text-secondary"
                        : "text-primary"
                    }`}
                  >
                    <span className="material-symbols-outlined">
                      {activity.icon}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
