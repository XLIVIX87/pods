"use client";

import { useMemo, useState } from "react";
import { formatNaira, formatBottleSize, SELL_SIZES, timeAgo } from "@/lib/utils";

type Supplier = { id: string; name: string };

type SupplierQuote = {
  id: string;
  supplierId: string;
  supplierName: string;
  pricePerKeg: number;
  kegSizeLitres: number;
  pricePerLitre: number;
  note: string | null;
  recordedAt: string;
};

type MarketPrice = {
  id: string;
  sourceLabel: string;
  bottleSizeMl: number;
  pricePerUnit: number;
  pricePerLitre: number;
  note: string | null;
  recordedAt: string;
};

type Tab = "overview" | "supplier" | "market";

export default function PriceTrackerClient({
  suppliers,
  initialSupplierQuotes,
  initialMarketPrices,
}: {
  suppliers: Supplier[];
  initialSupplierQuotes: SupplierQuote[];
  initialMarketPrices: MarketPrice[];
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [supplierQuotes, setSupplierQuotes] = useState(initialSupplierQuotes);
  const [marketPrices, setMarketPrices] = useState(initialMarketPrices);

  // ---- derived metrics ----
  const summary = useMemo(() => {
    const last7 = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const recentSupplier = supplierQuotes.filter(
      (q) => new Date(q.recordedAt).getTime() >= last7
    );
    const supplierPool =
      recentSupplier.length > 0 ? recentSupplier : supplierQuotes;

    const bestSupplier =
      supplierPool.length > 0
        ? supplierPool.reduce((min, q) =>
            q.pricePerLitre < min.pricePerLitre ? q : min
          )
        : null;

    const avgSupplier =
      supplierPool.length > 0
        ? supplierPool.reduce((s, q) => s + q.pricePerLitre, 0) /
          supplierPool.length
        : 0;

    // Market: latest per bottle size
    const byBottle = new Map<number, MarketPrice[]>();
    marketPrices.forEach((m) => {
      if (!byBottle.has(m.bottleSizeMl)) byBottle.set(m.bottleSizeMl, []);
      byBottle.get(m.bottleSizeMl)!.push(m);
    });

    const marketRows = Array.from(byBottle.entries())
      .map(([size, entries]) => {
        const recent = entries.filter(
          (e) => new Date(e.recordedAt).getTime() >= last7
        );
        const pool = recent.length > 0 ? recent : entries;
        const avgUnit =
          pool.reduce((s, e) => s + e.pricePerUnit, 0) / pool.length;
        const avgLitre =
          pool.reduce((s, e) => s + e.pricePerLitre, 0) / pool.length;
        const recommended = Math.round(avgUnit * 0.98); // 2% undercut
        return {
          size,
          avgUnit,
          avgLitre,
          recommended,
          samples: pool.length,
          latest: pool[0],
        };
      })
      .sort((a, b) => a.size - b.size);

    return { bestSupplier, avgSupplier, marketRows };
  }, [supplierQuotes, marketPrices]);

  return (
    <div className="px-6 mt-4 space-y-6">
      <header className="space-y-1">
        <h1 className="font-headline italic text-3xl font-bold text-on-surface">
          Price Tracker
        </h1>
        <p className="text-sm text-on-surface-variant">
          Supplier quotes, market prices, and suggested sell prices.
        </p>
      </header>

      {/* Tab switcher */}
      <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-surface-container-low">
        {(
          [
            { id: "overview", label: "Overview", icon: "insights" },
            { id: "supplier", label: "Suppliers", icon: "local_shipping" },
            { id: "market", label: "Market", icon: "storefront" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 transition-colors ${
              tab === t.id
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewPanel
          bestSupplier={summary.bestSupplier}
          avgSupplier={summary.avgSupplier}
          marketRows={summary.marketRows}
        />
      )}

      {tab === "supplier" && (
        <SupplierPanel
          suppliers={suppliers}
          quotes={supplierQuotes}
          onAdd={(q) => setSupplierQuotes((prev) => [q, ...prev])}
          onRemove={(id) =>
            setSupplierQuotes((prev) => prev.filter((q) => q.id !== id))
          }
        />
      )}

      {tab === "market" && (
        <MarketPanel
          prices={marketPrices}
          onAdd={(p) => setMarketPrices((prev) => [p, ...prev])}
          onRemove={(id) =>
            setMarketPrices((prev) => prev.filter((p) => p.id !== id))
          }
        />
      )}
    </div>
  );
}

// ==================== OVERVIEW ====================

function OverviewPanel({
  bestSupplier,
  avgSupplier,
  marketRows,
}: {
  bestSupplier: SupplierQuote | null;
  avgSupplier: number;
  marketRows: {
    size: number;
    avgUnit: number;
    avgLitre: number;
    recommended: number;
    samples: number;
    latest: MarketPrice;
  }[];
}) {
  return (
    <div className="space-y-5">
      {/* Supplier cost summary */}
      <div className="rounded-2xl p-5 bg-primary-container text-on-primary-container space-y-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-xl">
            local_shipping
          </span>
          <p className="text-xs font-bold uppercase tracking-widest opacity-80">
            Best supplier cost (last 7 days)
          </p>
        </div>
        {bestSupplier ? (
          <>
            <p className="text-3xl font-bold font-headline">
              {formatNaira(bestSupplier.pricePerLitre)}
              <span className="text-lg font-normal opacity-80">/litre</span>
            </p>
            <p className="text-sm opacity-80">
              {bestSupplier.supplierName} · {formatNaira(bestSupplier.pricePerKeg)} per {bestSupplier.kegSizeLitres}L keg
            </p>
            <p className="text-xs opacity-70">
              Avg across pool: {formatNaira(Math.round(avgSupplier))}/L
            </p>
          </>
        ) : (
          <p className="text-sm opacity-80">
            No supplier quotes yet. Add one under the Suppliers tab.
          </p>
        )}
      </div>

      {/* Market + recommended prices by size */}
      <div className="rounded-2xl p-5 bg-surface-container-low space-y-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-xl text-secondary">
            storefront
          </span>
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Market &amp; recommended sell price
          </p>
        </div>

        {marketRows.length === 0 && (
          <p className="text-sm text-on-surface-variant">
            No market prices logged yet. Add one under the Market tab.
          </p>
        )}

        <div className="space-y-3">
          {marketRows.map((row) => (
            <div
              key={row.size}
              className="rounded-xl bg-surface-container p-4 flex items-center justify-between gap-3"
            >
              <div>
                <p className="font-bold text-on-surface">
                  {formatBottleSize(row.size)}
                </p>
                <p className="text-xs text-on-surface-variant">
                  Market avg {formatNaira(Math.round(row.avgUnit))} · {formatNaira(Math.round(row.avgLitre))}/L · {row.samples} sample{row.samples === 1 ? "" : "s"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                  Recommended
                </p>
                <p className="text-xl font-bold text-on-surface">
                  {formatNaira(row.recommended)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-on-surface-variant italic">
          Recommended sell price = 2% below recent market average (tweak later once you see reactions).
        </p>
      </div>
    </div>
  );
}

// ==================== SUPPLIER PANEL ====================

function SupplierPanel({
  suppliers,
  quotes,
  onAdd,
  onRemove,
}: {
  suppliers: Supplier[];
  quotes: SupplierQuote[];
  onAdd: (q: SupplierQuote) => void;
  onRemove: (id: string) => void;
}) {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [pricePerKeg, setPricePerKeg] = useState("");
  const [kegSizeLitres, setKegSizeLitres] = useState("25");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supplierId || !pricePerKeg) {
      setError("Pick a supplier and enter a price.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/supplier-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          pricePerKeg: Number(pricePerKeg),
          kegSizeLitres: Number(kegSizeLitres) || 25,
          note,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const saved = await res.json();
      onAdd({
        id: saved.id,
        supplierId: saved.supplierId,
        supplierName: saved.supplier.name,
        pricePerKeg: saved.pricePerKeg,
        kegSizeLitres: saved.kegSizeLitres,
        pricePerLitre: saved.pricePerLitre,
        note: saved.note,
        recordedAt: saved.recordedAt,
      });
      setPricePerKeg("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this quote?")) return;
    const res = await fetch(`/api/supplier-prices/${id}`, { method: "DELETE" });
    if (res.ok) onRemove(id);
  }

  return (
    <div className="space-y-5">
      {suppliers.length === 0 ? (
        <div className="rounded-xl bg-surface-container-low p-6 text-center space-y-2">
          <p className="text-on-surface-variant text-sm">
            You need to add a supplier first.
          </p>
          <a
            href="/suppliers"
            className="inline-block text-sm font-bold text-primary"
          >
            Go to Suppliers →
          </a>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="rounded-2xl bg-surface-container-low p-5 space-y-4"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Log a supplier quote
          </p>

          <Field label="Supplier">
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full bg-surface-container rounded-lg px-3 py-3 text-on-surface"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Price per keg (₦)">
              <input
                inputMode="numeric"
                value={pricePerKeg}
                onChange={(e) => setPricePerKeg(e.target.value)}
                placeholder="e.g. 85000"
                className="w-full bg-surface-container rounded-lg px-3 py-3 text-on-surface"
              />
            </Field>
            <Field label="Keg size (L)">
              <input
                inputMode="decimal"
                value={kegSizeLitres}
                onChange={(e) => setKegSizeLitres(e.target.value)}
                className="w-full bg-surface-container rounded-lg px-3 py-3 text-on-surface"
              />
            </Field>
          </div>

          <Field label="Note (optional)">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Delivered, includes transport"
              className="w-full bg-surface-container rounded-lg px-3 py-3 text-on-surface"
            />
          </Field>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-lg bg-primary text-on-primary font-bold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save quote"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Recent quotes
        </p>

        {quotes.length === 0 && (
          <div className="rounded-xl bg-surface-container-low p-6 text-center">
            <p className="text-on-surface-variant text-sm">No quotes yet.</p>
          </div>
        )}

        {quotes.map((q) => (
          <div
            key={q.id}
            className="rounded-xl bg-surface-container-low p-4 flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="font-bold text-on-surface">{q.supplierName}</p>
              <p className="text-sm text-on-surface-variant">
                {formatNaira(q.pricePerKeg)} / {q.kegSizeLitres}L keg · {formatNaira(Math.round(q.pricePerLitre))}/L
              </p>
              <p className="text-[11px] text-on-surface-variant">
                {timeAgo(q.recordedAt)}
                {q.note ? ` · ${q.note}` : ""}
              </p>
            </div>
            <button
              onClick={() => remove(q.id)}
              className="text-on-surface-variant p-2"
              aria-label="Delete"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== MARKET PANEL ====================

function MarketPanel({
  prices,
  onAdd,
  onRemove,
}: {
  prices: MarketPrice[];
  onAdd: (p: MarketPrice) => void;
  onRemove: (id: string) => void;
}) {
  const [sourceLabel, setSourceLabel] = useState("");
  const [bottleSizeMl, setBottleSizeMl] = useState("1000");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!sourceLabel.trim() || !pricePerUnit) {
      setError("Enter a source (market/shop name) and a price.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/market-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceLabel: sourceLabel.trim(),
          bottleSizeMl: Number(bottleSizeMl),
          pricePerUnit: Number(pricePerUnit),
          note,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const saved = await res.json();
      onAdd(saved);
      setPricePerUnit("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this market price entry?")) return;
    const res = await fetch(`/api/market-prices/${id}`, { method: "DELETE" });
    if (res.ok) onRemove(id);
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={submit}
        className="rounded-2xl bg-surface-container-low p-5 space-y-4"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Log a market price
        </p>

        <Field label="Source (market or shop)">
          <input
            value={sourceLabel}
            onChange={(e) => setSourceLabel(e.target.value)}
            placeholder="e.g. Mile 12, Mushin, Competitor Shop A"
            className="w-full bg-surface-container rounded-lg px-3 py-3 text-on-surface"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Bottle / container size">
            <select
              value={bottleSizeMl}
              onChange={(e) => setBottleSizeMl(e.target.value)}
              className="w-full bg-surface-container rounded-lg px-3 py-3 text-on-surface"
            >
              {SELL_SIZES.map((s) => (
                <option key={s} value={s}>
                  {formatBottleSize(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Price per unit (₦)">
            <input
              inputMode="numeric"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.value)}
              placeholder="e.g. 4500"
              className="w-full bg-surface-container rounded-lg px-3 py-3 text-on-surface"
            />
          </Field>
        </div>

        <Field label="Note (optional)">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Saturday price, wholesale"
            className="w-full bg-surface-container rounded-lg px-3 py-3 text-on-surface"
          />
        </Field>

        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-lg bg-secondary text-on-secondary font-bold disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save market price"}
        </button>
      </form>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Recent market prices
        </p>

        {prices.length === 0 && (
          <div className="rounded-xl bg-surface-container-low p-6 text-center">
            <p className="text-on-surface-variant text-sm">No entries yet.</p>
          </div>
        )}

        {prices.map((p) => (
          <div
            key={p.id}
            className="rounded-xl bg-surface-container-low p-4 flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="font-bold text-on-surface truncate">
                {p.sourceLabel} · {formatBottleSize(p.bottleSizeMl)}
              </p>
              <p className="text-sm text-on-surface-variant">
                {formatNaira(p.pricePerUnit)} · {formatNaira(Math.round(p.pricePerLitre))}/L
              </p>
              <p className="text-[11px] text-on-surface-variant">
                {timeAgo(p.recordedAt)}
                {p.note ? ` · ${p.note}` : ""}
              </p>
            </div>
            <button
              onClick={() => remove(p.id)}
              className="text-on-surface-variant p-2"
              aria-label="Delete"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-on-surface-variant">
        {label}
      </span>
      {children}
    </label>
  );
}
