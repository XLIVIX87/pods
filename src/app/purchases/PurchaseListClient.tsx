"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatNaira, formatDate } from "@/lib/utils";

export interface PurchaseRow {
  id: string;
  date: string;
  supplierName: string;
  supplierLocation: string | null;
  kegs: number;
  totalCost: number;
  costPerLitre: number;
  status: string;
}

type FilterKey = "all" | "pending" | "accepted" | "rejected";

const FILTERS: { key: FilterKey; label: string; match?: string[] }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending Check", match: ["PENDING_CHECK"] },
  {
    key: "accepted",
    label: "Accepted",
    match: ["ACCEPTED", "ACCEPTED_WITH_NOTE"],
  },
  { key: "rejected", label: "Rejected", match: ["REJECTED"] },
];

const statusLabel = (status: string) => {
  switch (status) {
    case "PENDING_CHECK":
      return "Pending";
    case "ACCEPTED":
      return "Accepted";
    case "ACCEPTED_WITH_NOTE":
      return "Accepted +";
    case "REJECTED":
      return "Rejected";
    default:
      return status;
  }
};

const statusClass = (status: string) => {
  switch (status) {
    case "PENDING_CHECK":
      return "bg-tertiary-fixed text-on-tertiary-fixed";
    case "ACCEPTED":
    case "ACCEPTED_WITH_NOTE":
      return "bg-success-light text-success";
    case "REJECTED":
      return "bg-error-container text-on-error-container";
    default:
      return "bg-surface-container-high text-on-surface-variant";
  }
};

export default function PurchaseListClient({
  purchases,
}: {
  purchases: PurchaseRow[];
}) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter);
    if (!f?.match) return purchases;
    return purchases.filter((p) => f.match!.includes(p.status));
  }, [purchases, filter]);

  return (
    <>
      {/* Filter pills */}
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

      {/* Purchase cards */}
      <div className="space-y-3 mt-5">
        {filtered.length === 0 && (
          <div className="bg-surface-container-low rounded-xl p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2 block">
              inventory
            </span>
            <p className="text-on-surface-variant">
              {purchases.length === 0
                ? "No purchases yet. Start by buying some oil."
                : "No purchases match this filter."}
            </p>
          </div>
        )}

        {filtered.map((p) => (
          <Link
            key={p.id}
            href={
              p.status === "PENDING_CHECK"
                ? `/check/${p.id}`
                : `/purchases/${p.id}`
            }
            className="block bg-surface-container-low rounded-xl p-5 transition-all active:bg-surface-container-high active:scale-[0.98]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusClass(p.status)}`}
                  >
                    {statusLabel(p.status)}
                  </span>
                  <span className="text-[10px] text-on-surface-variant font-medium">
                    {formatDate(p.date)}
                  </span>
                </div>
                <p className="font-body font-semibold text-on-surface">
                  {p.kegs} kegs from {p.supplierName}
                </p>
                {p.supplierLocation && (
                  <p className="text-xs text-on-surface-variant">
                    {p.supplierLocation}
                  </p>
                )}
                <p className="text-lg font-bold text-on-surface mt-1">
                  {formatNaira(p.totalCost)}{" "}
                  <span className="text-xs font-normal text-on-surface-variant">
                    · {formatNaira(Math.round(p.costPerLitre))}/L
                  </span>
                </p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant/40 shrink-0">
                chevron_right
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
