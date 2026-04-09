"use client";

import { useRouter, usePathname } from "next/navigation";

export type RangeKey = "7d" | "30d" | "90d" | "ytd" | "all";

const OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "All" },
];

export default function DateRangePicker({
  selected,
}: {
  selected: RangeKey;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSelect = (key: RangeKey) => {
    const params = new URLSearchParams();
    if (key !== "30d") params.set("range", key);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="inline-flex items-center bg-surface-container-lowest rounded-xl p-1 shadow-sm border border-outline-variant/30">
      {OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => handleSelect(opt.key)}
          className={`px-4 py-2 rounded-lg text-sm font-label font-semibold transition-all active:scale-95 ${
            selected === opt.key
              ? "bg-primary text-on-primary"
              : "text-on-surface-variant hover:bg-surface-container-low"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
