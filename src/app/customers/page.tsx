export const dynamic = "force-dynamic";

import BottomNav from "@/components/layout/BottomNav";
import TopBar from "@/components/layout/TopBar";
import { prisma } from "@/lib/prisma";
import CustomerListClient, { type CustomerCard } from "./CustomerListClient";

async function getCustomersData(): Promise<CustomerCard[]> {
  const customers = await prisma.customer.findMany({
    include: {
      sales: {
        include: { payments: true, items: true },
        orderBy: { date: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return customers.map((c) => {
    const totalSpent = c.sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const lastOrder = c.sales[0]?.date ?? null;
    const outstanding = c.sales.reduce((sum, s) => {
      const saleOwed = s.payments.reduce((ps, p) => ps + p.balanceOwed, 0);
      return sum + saleOwed;
    }, 0);

    const orderDates = c.sales.map((s) => s.date.getTime()).sort((a, b) => a - b);
    let avgFrequencyDays: number | null = null;
    if (orderDates.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < orderDates.length; i++) {
        intervals.push((orderDates[i] - orderDates[i - 1]) / 86400000);
      }
      avgFrequencyDays = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    }

    const daysSinceLastOrder = lastOrder
      ? (Date.now() - new Date(lastOrder).getTime()) / 86400000
      : null;

    const isOverdue =
      avgFrequencyDays !== null &&
      daysSinceLastOrder !== null &&
      daysSinceLastOrder > avgFrequencyDays * 1.5;

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      location: c.location,
      customerType: c.customerType,
      totalSpent,
      lastOrder: lastOrder ? lastOrder.toISOString() : null,
      outstanding,
      orderCount: c.sales.length,
      isOverdue,
      avgFrequencyDays,
      daysSinceLastOrder,
    };
  });
}

export default async function CustomersPage() {
  const customers = await getCustomersData();

  const totalCustomers = customers.length;
  const oweCount = customers.filter((c) => c.outstanding > 0).length;

  return (
    <div className="min-h-dvh pb-32">
      <TopBar variant="page" title="Customers" />

      <div className="px-6 flex items-center gap-3 mt-1 mb-4">
        <span className="bg-primary-fixed text-on-primary-fixed text-xs font-bold px-2.5 py-1 rounded-full font-label">
          {totalCustomers} total
        </span>
        {oweCount > 0 && (
          <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-full font-label">
            {oweCount} owe money
          </span>
        )}
      </div>

      <main className="px-6 space-y-5">
        <CustomerListClient customers={customers} />
      </main>

      <BottomNav />
    </div>
  );
}
