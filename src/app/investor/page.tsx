export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatNaira, formatBottleSize } from "@/lib/utils";

async function getInvestorData() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const [sales, purchases, payments, customers, stockLevels, qualityChecks] =
    await Promise.all([
      prisma.sale.findMany({
        where: { date: { gte: thirtyDaysAgo } },
        include: { items: true, payments: true, customer: true },
        orderBy: { date: "desc" },
      }),
      prisma.purchase.findMany({
        where: { date: { gte: thirtyDaysAgo } },
        include: { supplier: true, qualityCheck: true },
        orderBy: { date: "desc" },
      }),
      prisma.payment.findMany({
        where: { paidAt: { gte: thirtyDaysAgo } },
      }),
      prisma.customer.findMany({
        include: {
          sales: { include: { payments: true } },
        },
      }),
      prisma.stockLevel.findMany(),
      prisma.qualityCheck.findMany({
        where: { checkedAt: { gte: thirtyDaysAgo } },
        include: { purchase: { include: { supplier: true } } },
      }),
    ]);

  // KPIs
  const revenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalCost = sales.reduce((sum, s) => sum + s.totalCost, 0);
  const grossProfit = revenue - totalCost;
  const cashCollected = payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const outstandingDebts = sales.reduce((sum, s) => {
    return sum + s.payments.reduce((ps, p) => ps + p.balanceOwed, 0);
  }, 0);

  // Revenue by product size
  const sizeRevenue: Record<number, number> = {};
  sales.forEach((s) =>
    s.items.forEach((item) => {
      sizeRevenue[item.bottleSizeMl] =
        (sizeRevenue[item.bottleSizeMl] || 0) + item.lineTotal;
    })
  );
  const revenueBySize = Object.entries(sizeRevenue)
    .map(([sizeMl, rev]) => ({ sizeMl: Number(sizeMl), revenue: rev }))
    .sort((a, b) => b.revenue - a.revenue);
  const maxSizeRevenue = Math.max(...revenueBySize.map((r) => r.revenue), 1);

  // Weekly revenue & profit trend (last 4 weeks)
  const weeklyData: { label: string; revenue: number; profit: number }[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(now.getTime() - (w + 1) * 7 * 86400000);
    const weekEnd = new Date(now.getTime() - w * 7 * 86400000);
    const weekSales = sales.filter(
      (s) => s.date >= weekStart && s.date < weekEnd
    );
    const weekRevenue = weekSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const weekProfit = weekSales.reduce(
      (sum, s) => sum + s.totalAmount - s.totalCost,
      0
    );
    weeklyData.push({
      label: `Wk ${4 - w}`,
      revenue: weekRevenue,
      profit: weekProfit,
    });
  }
  const maxWeeklyRevenue = Math.max(...weeklyData.map((w) => w.revenue), 1);

  // Top 5 customers by spend
  const customerSpend = customers
    .map((c) => ({
      id: c.id,
      name: c.name,
      totalSpent: c.sales.reduce((sum, s) => sum + s.totalAmount, 0),
      orders: c.sales.length,
      outstanding: c.sales.reduce(
        (sum, s) =>
          sum + s.payments.reduce((ps, p) => ps + p.balanceOwed, 0),
        0
      ),
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  // Supplier quality scorecard
  const supplierScores: Record<
    string,
    { name: string; total: number; passed: number; rejected: number }
  > = {};
  qualityChecks.forEach((qc) => {
    const suppName = qc.purchase.supplier.name;
    const suppId = qc.purchase.supplierId;
    if (!supplierScores[suppId]) {
      supplierScores[suppId] = { name: suppName, total: 0, passed: 0, rejected: 0 };
    }
    supplierScores[suppId].total++;
    if (qc.result === "ACCEPT" || qc.result === "ACCEPT_WITH_NOTE") {
      supplierScores[suppId].passed++;
    } else if (qc.result === "REJECT") {
      supplierScores[suppId].rejected++;
    }
  });
  const supplierQuality = Object.values(supplierScores).sort(
    (a, b) => b.total - a.total
  );

  // Risk flags
  const overduePayments = sales.filter((s) => {
    const owed = s.payments.reduce((sum, p) => sum + p.balanceOwed, 0);
    const daysSince = (now.getTime() - s.date.getTime()) / 86400000;
    return owed > 0 && daysSince > 14;
  });

  const lowStockItems = stockLevels.filter(
    (sl) => sl.itemType === "BOTTLE" && sl.quantity < 10
  );

  const qualityAlerts = qualityChecks.filter((qc) => qc.result === "REJECT");

  return {
    revenue,
    grossProfit,
    cashCollected,
    outstandingDebts,
    weeklyData,
    maxWeeklyRevenue,
    revenueBySize,
    maxSizeRevenue,
    customerSpend,
    supplierQuality,
    overduePayments,
    lowStockItems,
    qualityAlerts,
  };
}

export default async function InvestorDashboard() {
  const data = await getInvestorData();

  const today = new Date().toLocaleDateString("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const kpis = [
    {
      label: "Revenue (30d)",
      value: formatNaira(data.revenue),
      icon: "trending_up",
      color: "bg-primary-container text-on-primary-container",
    },
    {
      label: "Gross Profit",
      value: formatNaira(data.grossProfit),
      icon: "savings",
      color: "bg-success-light text-success",
    },
    {
      label: "Cash Collected",
      value: formatNaira(data.cashCollected),
      icon: "account_balance",
      color: "bg-tertiary-fixed text-on-tertiary-fixed",
    },
    {
      label: "Outstanding Debts",
      value: formatNaira(data.outstandingDebts),
      icon: "warning",
      color: "bg-orange-100 text-orange-800",
    },
  ];

  const totalRisks =
    data.overduePayments.length +
    data.lowStockItems.length +
    data.qualityAlerts.length;

  return (
    <div className="min-h-dvh bg-surface">
      {/* Investor Header */}
      <header className="bg-primary text-on-primary">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl">agriculture</span>
            <div>
              <h1 className="text-2xl font-headline font-bold italic tracking-tight">
                PODS
              </h1>
              <p className="text-on-primary/70 text-xs font-label">
                Investor Dashboard
              </p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 font-label text-sm font-medium">
            <span className="text-on-primary/90 border-b-2 border-on-primary pb-0.5">
              Overview
            </span>
            <span className="text-on-primary/50 hover:text-on-primary/80 cursor-pointer transition-colors">
              Financials
            </span>
            <span className="text-on-primary/50 hover:text-on-primary/80 cursor-pointer transition-colors">
              Operations
            </span>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm font-label text-on-primary/70 hidden sm:block">
              {today}
            </span>
            <div className="w-9 h-9 rounded-full bg-on-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">person</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-8 space-y-8">
        {/* KPI Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.color}`}
                >
                  <span className="material-symbols-outlined text-xl">
                    {kpi.icon}
                  </span>
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-on-surface">
                {kpi.value}
              </p>
            </div>
          ))}
        </section>

        {/* Charts Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue & Profit Trend */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30">
            <h3 className="font-headline font-bold italic text-lg text-on-surface mb-1">
              Revenue &amp; Profit Trend
            </h3>
            <p className="text-xs text-on-surface-variant mb-6">Last 4 weeks</p>

            <div className="flex items-end gap-4 h-48">
              {data.weeklyData.map((week) => {
                const revHeight = Math.max(
                  (week.revenue / data.maxWeeklyRevenue) * 100,
                  4
                );
                const profitHeight = Math.max(
                  (week.profit / data.maxWeeklyRevenue) * 100,
                  4
                );
                return (
                  <div
                    key={week.label}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div className="flex items-end gap-1 h-40 w-full justify-center">
                      <div
                        className="bg-primary/80 rounded-t-md w-5 lg:w-8 transition-all"
                        style={{ height: `${revHeight}%` }}
                        title={`Revenue: ${formatNaira(week.revenue)}`}
                      />
                      <div
                        className="bg-success/70 rounded-t-md w-5 lg:w-8 transition-all"
                        style={{ height: `${profitHeight}%` }}
                        title={`Profit: ${formatNaira(week.profit)}`}
                      />
                    </div>
                    <span className="text-[11px] text-on-surface-variant font-label">
                      {week.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs font-label text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-primary/80 rounded-sm" /> Revenue
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-success/70 rounded-sm" /> Profit
              </span>
            </div>
          </div>

          {/* Revenue by Product Size */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30">
            <h3 className="font-headline font-bold italic text-lg text-on-surface mb-1">
              Revenue by Product Size
            </h3>
            <p className="text-xs text-on-surface-variant mb-6">Last 30 days</p>

            <div className="space-y-4">
              {data.revenueBySize.length === 0 && (
                <p className="text-on-surface-variant text-sm py-8 text-center">
                  No sales data yet
                </p>
              )}
              {data.revenueBySize.map((item) => {
                const pct = (item.revenue / data.maxSizeRevenue) * 100;
                return (
                  <div key={item.sizeMl} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-label font-medium text-on-surface">
                        {formatBottleSize(item.sizeMl)}
                      </span>
                      <span className="font-bold text-on-surface">
                        {formatNaira(item.revenue)}
                      </span>
                    </div>
                    <div className="h-4 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full bg-tertiary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Tables Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Customers */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30">
            <h3 className="font-headline font-bold italic text-lg text-on-surface mb-4">
              Top 5 Customers
            </h3>

            {data.customerSpend.length === 0 ? (
              <p className="text-on-surface-variant text-sm py-4 text-center">
                No customer data yet
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-on-surface-variant">
                      <th className="text-left font-label font-semibold pb-3 pr-3">
                        Customer
                      </th>
                      <th className="text-right font-label font-semibold pb-3 pr-3">
                        Orders
                      </th>
                      <th className="text-right font-label font-semibold pb-3 pr-3">
                        Total Spent
                      </th>
                      <th className="text-right font-label font-semibold pb-3">
                        Owed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.customerSpend.map((c, i) => (
                      <tr
                        key={c.id}
                        className="border-b border-outline-variant/10 last:border-0"
                      >
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-primary-fixed text-on-primary-fixed rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">
                              {i + 1}
                            </span>
                            <span className="font-medium text-on-surface truncate">
                              {c.name}
                            </span>
                          </div>
                        </td>
                        <td className="text-right py-3 pr-3 text-on-surface-variant">
                          {c.orders}
                        </td>
                        <td className="text-right py-3 pr-3 font-bold text-on-surface">
                          {formatNaira(c.totalSpent)}
                        </td>
                        <td
                          className={`text-right py-3 font-medium ${
                            c.outstanding > 0
                              ? "text-orange-600"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {c.outstanding > 0
                            ? formatNaira(c.outstanding)
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Supplier Quality Scorecard */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30">
            <h3 className="font-headline font-bold italic text-lg text-on-surface mb-4">
              Supplier Quality Scorecard
            </h3>

            {data.supplierQuality.length === 0 ? (
              <p className="text-on-surface-variant text-sm py-4 text-center">
                No quality check data yet
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-on-surface-variant">
                      <th className="text-left font-label font-semibold pb-3 pr-3">
                        Supplier
                      </th>
                      <th className="text-right font-label font-semibold pb-3 pr-3">
                        Checks
                      </th>
                      <th className="text-right font-label font-semibold pb-3 pr-3">
                        Pass Rate
                      </th>
                      <th className="text-right font-label font-semibold pb-3">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.supplierQuality.map((s) => {
                      const passRate =
                        s.total > 0
                          ? Math.round((s.passed / s.total) * 100)
                          : 0;
                      return (
                        <tr
                          key={s.name}
                          className="border-b border-outline-variant/10 last:border-0"
                        >
                          <td className="py-3 pr-3 font-medium text-on-surface">
                            {s.name}
                          </td>
                          <td className="text-right py-3 pr-3 text-on-surface-variant">
                            {s.total}
                          </td>
                          <td className="text-right py-3 pr-3 font-bold text-on-surface">
                            {passRate}%
                          </td>
                          <td className="text-right py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                passRate >= 80
                                  ? "bg-success-light text-success"
                                  : passRate >= 50
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-error-container text-on-error-container"
                              }`}
                            >
                              {passRate >= 80
                                ? "Good"
                                : passRate >= 50
                                  ? "Fair"
                                  : "Poor"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Risk Flags Section */}
        <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30">
          <div className="flex items-center gap-2 mb-5">
            <span className="material-symbols-outlined text-error text-2xl">
              flag
            </span>
            <h3 className="font-headline font-bold italic text-lg text-on-surface">
              Risk Flags
            </h3>
            {totalRisks > 0 && (
              <span className="bg-error text-on-error text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                {totalRisks}
              </span>
            )}
          </div>

          {totalRisks === 0 ? (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-success text-4xl mb-2 block">
                verified
              </span>
              <p className="text-on-surface-variant font-label">
                No active risk flags. Operations are running smoothly.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Overdue Payments */}
              <div className="bg-orange-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-600 text-xl">
                    schedule
                  </span>
                  <h4 className="font-label font-semibold text-orange-800 text-sm">
                    Overdue Payments
                  </h4>
                </div>
                {data.overduePayments.length === 0 ? (
                  <p className="text-xs text-orange-600/70">None</p>
                ) : (
                  <ul className="space-y-1">
                    {data.overduePayments.slice(0, 5).map((s) => {
                      const owed = s.payments.reduce(
                        (sum, p) => sum + p.balanceOwed,
                        0
                      );
                      return (
                        <li
                          key={s.id}
                          className="text-xs text-orange-800 flex justify-between"
                        >
                          <span className="truncate mr-2">
                            {s.customer.name}
                          </span>
                          <span className="font-bold whitespace-nowrap">
                            {formatNaira(owed)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Low Stock */}
              <div className="bg-error-container/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-error text-xl">
                    inventory
                  </span>
                  <h4 className="font-label font-semibold text-on-error-container text-sm">
                    Low Stock
                  </h4>
                </div>
                {data.lowStockItems.length === 0 ? (
                  <p className="text-xs text-on-error-container/70">
                    All stock levels healthy
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {data.lowStockItems.map((sl) => (
                      <li
                        key={sl.id}
                        className="text-xs text-on-error-container flex justify-between"
                      >
                        <span>{formatBottleSize(sl.sizeMl)}</span>
                        <span className="font-bold">
                          {sl.quantity} left
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Quality Alerts */}
              <div className="bg-error-container/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-error text-xl">
                    report
                  </span>
                  <h4 className="font-label font-semibold text-on-error-container text-sm">
                    Quality Rejects
                  </h4>
                </div>
                {data.qualityAlerts.length === 0 ? (
                  <p className="text-xs text-on-error-container/70">
                    No quality issues
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {data.qualityAlerts.slice(0, 5).map((qc) => (
                      <li
                        key={qc.id}
                        className="text-xs text-on-error-container"
                      >
                        {qc.purchase.supplier.name}
                        {qc.note ? ` - ${qc.note}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-outline-variant/30 mt-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-on-surface-variant text-sm font-label">
            <span className="material-symbols-outlined text-lg">agriculture</span>
            <span className="font-headline font-bold italic">PODS</span>
            <span className="text-outline">|</span>
            <span>Palm Oil Distribution System</span>
          </div>
          <p className="text-xs text-on-surface-variant/60 font-label text-center sm:text-right">
            Data auto-generated from PODS operator entries. Updated in real-time.
          </p>
        </div>
      </footer>
    </div>
  );
}
