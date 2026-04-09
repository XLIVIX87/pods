"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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

export interface CustomerCard {
  id: string;
  name: string;
  phone: string | null;
  location: string | null;
  customerType: string;
  totalSpent: number;
  lastOrder: string | null;
  outstanding: number;
  orderCount: number;
  isOverdue: boolean;
  avgFrequencyDays: number | null;
  daysSinceLastOrder: number | null;
}

type FilterKey = "all" | "owe" | "regulars" | "new";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "owe", label: "Owe Money" },
  { key: "regulars", label: "Regulars" },
  { key: "new", label: "New" },
];

export default function CustomerListClient({
  customers,
}: {
  customers: CustomerCard[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      // Text match
      if (q) {
        const hay = `${c.name} ${c.phone ?? ""} ${c.location ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // Filter match
      switch (filter) {
        case "owe":
          return c.outstanding > 0;
        case "regulars":
          return c.orderCount >= 3;
        case "new":
          return c.orderCount < 3;
        default:
          return true;
      }
    });
  }, [customers, search, filter]);

  const overdueRegulars = useMemo(
    () => customers.filter((c) => c.isOverdue && c.orderCount >= 3 && c.phone),
    [customers]
  );

  return (
    <>
      {/* Search Bar */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-xl">
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="w-full bg-surface-container-low rounded-xl pl-12 pr-4 py-3.5 font-body text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-label font-semibold whitespace-nowrap transition-all active:scale-95 ${
              filter === f.key
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Customer Pulse Banner (only on All filter, no search) */}
      {filter === "all" && !search && overdueRegulars.length > 0 && (
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
            {overdueRegulars.length === 1
              ? "customer hasn't"
              : "customers haven't"}{" "}
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
        {filtered.length === 0 && (
          <div className="bg-surface-container-low rounded-xl p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2 block">
              {customers.length === 0 ? "person_add" : "search_off"}
            </span>
            <p className="text-on-surface-variant">
              {customers.length === 0
                ? "No customers yet. They will appear here after your first sale."
                : "No customers match your search or filter."}
            </p>
          </div>
        )}

        {filtered.map((customer) => (
          <Link
            key={customer.id}
            href={`/customers/${customer.id}`}
            className={`block bg-surface-container-low rounded-xl p-4 transition-all active:bg-surface-container-high ${
              customer.outstanding > 0 ? "border-l-4 border-l-orange-400" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm font-label shrink-0 ${getAvatarColor(
                  customer.name
                )}`}
              >
                {getInitials(customer.name)}
              </div>

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

              <span className="material-symbols-outlined text-on-surface-variant/30 text-xl shrink-0">
                chevron_right
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
