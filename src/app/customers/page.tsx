export const dynamic = "force-dynamic";

import Link from "next/link";
import BottomNav from "@/components/layout/BottomNav";
import TopBar from "@/components/layout/TopBar";
import { prisma } from "@/lib/prisma";
import { formatNaira, timeAgo, whatsappLink } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-primary-container text-on-primary-container",
  "bg-secondary-container text-on-secondary-container",
  "bg-tertiary-container text-on-tertiary-container",
  "bg-primary-fixed text-on-primary-fixed",
  "bg-secondary-fixed text-on-secondary-fixed",
  "bg-tertiary-fixed text-on-tertiary-fixed",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

async function getCustomersData() {
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

    // Calculate average order frequency in days
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
      lastOrder,
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

  // Separate overdue regulars for the pulse banner
  const overdueRegulars = customers.filter(
    (c) => c.isOverdue && c.orderCount >= 3 && c.phone
  );

  return (
    <div className="min-h-dvh pb-32">
      <TopBar variant="page" title="Customers" />

      {/* Sub-header stats */}
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
        {/* Search Bar */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-xl">
            search
          </span>
          <input
            type="text"
            placeholder="Search customers..."
            className="w-full bg-surface-container-low rounded-xl pl-12 pr-4 py-3.5 font-body text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {["All", "Owe Money", "Regulars", "New"].map((filter, i) => (
            <button
              key={filter}
              className={`px-4 py-2 rounded-full text-sm font-label font-semibold whitespace-nowrap transition-all active:scale-95 ${
                i === 0
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Customer Pulse Banner */}
        {overdueRegulars.length > 0 && (
          <div className="bg-tertiary-fixed rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-on-tertiary-fixed text-xl">
                notifications_active
              </span>
              <h3 className="font-headline font-bold text-on-tertiary-fixed italic">
                Customer Pulse
              </h3>
            </div>
            <p className="text-on-tertiary-fixed/80 text-sm font-body">
              {overdueRegulars.length} regular{" "}
              {overdueRegulars.length === 1 ? "customer hasn't" : "customers haven't"}{" "}
              ordered in a while.
            </p>
            <div className="space-y-2">
              {overdueRegulars.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between bg-surface/50 rounded-xl p-3"
                >
                  <div>
                    <p className="font-medium text-on-surface text-sm">{c.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      Last order {Math.round(c.daysSinceLastOrder!)} days ago
                      {c.avgFrequencyDays
                        ? ` (usually every ${Math.round(c.avgFrequencyDays)} days)`
                        : ""}
                    </p>
                  </div>
                  <a
                    href={whatsappLink(
                      c.phone!,
                      `Hi ${c.name.split(" ")[0]}, hope you're doing well! Would you like to place an order for palm oil?`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-success text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform"
                  >
                    <span className="material-symbols-outlined text-sm">chat</span>
                    WhatsApp
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Cards */}
        <div className="space-y-3">
          {customers.length === 0 && (
            <div className="bg-surface-container-low rounded-xl p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2 block">
                person_add
              </span>
              <p className="text-on-surface-variant">
                No customers yet. They will appear here after your first sale.
              </p>
            </div>
          )}

          {customers.map((customer) => (
            <Link
              key={customer.id}
              href={`/customers/${customer.id}`}
              className={`block bg-surface-container-low rounded-xl p-4 transition-all active:bg-surface-container-high ${
                customer.outstanding > 0 ? "border-l-4 border-l-orange-400" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm font-label shrink-0 ${getAvatarColor(
                    customer.name
                  )}`}
                >
                  {getInitials(customer.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-body font-semibold text-on-surface truncate">
                      {customer.name}
                    </h3>
                    {customer.outstanding > 0 && (
                      <span className="text-orange-600 font-bold text-sm font-label whitespace-nowrap ml-2">
                        Owes {formatNaira(customer.outstanding)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-0.5">
                    {customer.location && (
                      <span className="text-xs text-on-surface-variant flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-xs">
                          location_on
                        </span>
                        {customer.location}
                      </span>
                    )}
                    {customer.customerType === "NEW" && (
                      <span className="bg-primary-fixed text-on-primary-fixed text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        NEW
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="text-xs text-on-surface-variant font-label">
                      Spent {formatNaira(customer.totalSpent)}
                    </span>
                    {customer.lastOrder && (
                      <span className="text-xs text-on-surface-variant/60 font-label">
                        Last: {timeAgo(customer.lastOrder)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Chevron */}
                <span className="material-symbols-outlined text-on-surface-variant/30 text-xl shrink-0">
                  chevron_right
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
