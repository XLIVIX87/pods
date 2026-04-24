"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatNaira } from "@/lib/utils";

type Props = {
  purchaseId: string;
  status: string;
  hasPackingSessions: boolean;
  current: {
    kegs: number;
    kegSizeLitres: number;
    pricePerKeg: number;
    transportCost: number;
  };
};

const EDITABLE = ["IN_TRANSIT", "PENDING_CHECK"];

export default function PurchaseActions({
  purchaseId,
  status,
  hasPackingSessions,
  current,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [kegs, setKegs] = useState(String(current.kegs));
  const [kegSize, setKegSize] = useState(String(current.kegSizeLitres));
  const [pricePerKeg, setPricePerKeg] = useState(String(current.pricePerKeg));
  const [transportCost, setTransportCost] = useState(
    String(current.transportCost)
  );

  const canEdit = EDITABLE.includes(status);
  const canVoid = !hasPackingSessions; // accepted purchases can void if not packed from

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/purchases/${purchaseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kegs: Number(kegs),
          kegSizeLitres: Number(kegSize),
          pricePerKeg: Number(pricePerKeg),
          transportCost: Number(transportCost),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save");
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const voidPurchase = async () => {
    const reason = window.prompt(
      status === "ACCEPTED" || status === "ACCEPTED_WITH_NOTE"
        ? "Voiding this accepted purchase will reverse the stock. Reason?"
        : "Delete this purchase? Reason?"
    );
    if (reason === null) return;
    setVoiding(true);
    setError(null);
    try {
      const res = await fetch(`/api/purchases/${purchaseId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to void");
      }
      router.push("/purchases");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setVoiding(false);
    }
  };

  const livePreview = () => {
    const totalCost =
      Number(kegs) * Number(pricePerKeg) + Number(transportCost);
    const totalLitres = Number(kegs) * Number(kegSize);
    const costPerLitre = totalLitres > 0 ? totalCost / totalLitres : 0;
    return { totalCost, totalLitres, costPerLitre };
  };

  const preview = livePreview();

  return (
    <section className="bg-surface-container-low rounded-xl p-5 space-y-4">
      <p className="font-label text-xs font-bold text-outline uppercase tracking-wider">
        Actions
      </p>

      {error && (
        <p className="text-sm text-error font-medium">{error}</p>
      )}

      {editing ? (
        <form onSubmit={submitEdit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kegs">
              <input
                inputMode="numeric"
                value={kegs}
                onChange={(e) => setKegs(e.target.value)}
                className="w-full bg-surface-container rounded-lg px-3 py-2.5 text-on-surface"
              />
            </Field>
            <Field label="Keg size (L)">
              <input
                inputMode="decimal"
                value={kegSize}
                onChange={(e) => setKegSize(e.target.value)}
                className="w-full bg-surface-container rounded-lg px-3 py-2.5 text-on-surface"
              />
            </Field>
            <Field label="Price per keg (₦)">
              <input
                inputMode="numeric"
                value={pricePerKeg}
                onChange={(e) => setPricePerKeg(e.target.value)}
                className="w-full bg-surface-container rounded-lg px-3 py-2.5 text-on-surface"
              />
            </Field>
            <Field label="Transport (₦)">
              <input
                inputMode="numeric"
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value)}
                className="w-full bg-surface-container rounded-lg px-3 py-2.5 text-on-surface"
              />
            </Field>
          </div>

          <div className="bg-surface-container rounded-lg p-3 text-xs text-on-surface-variant">
            New total:{" "}
            <span className="text-on-surface font-bold">
              {formatNaira(Math.round(preview.totalCost))}
            </span>
            {" · "}
            Cost/L:{" "}
            <span className="text-on-surface font-bold">
              {formatNaira(Math.round(preview.costPerLitre))}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 py-3 rounded-lg bg-surface-container text-on-surface font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-lg bg-primary text-on-primary font-bold disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2">
          {canEdit ? (
            <button
              onClick={() => setEditing(true)}
              className="w-full py-3 rounded-lg bg-surface-container text-on-surface font-bold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">edit</span>
              Edit purchase
            </button>
          ) : (
            <p className="text-xs text-on-surface-variant italic">
              Editing is only allowed before the quality check accepts the
              order.
            </p>
          )}

          {canVoid ? (
            <button
              onClick={voidPurchase}
              disabled={voiding}
              className="w-full py-3 rounded-lg bg-error-container text-on-error-container font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">
                cancel
              </span>
              {voiding ? "Voiding…" : "Void purchase"}
            </button>
          ) : (
            <p className="text-xs text-on-surface-variant italic">
              This purchase has already been packed from and cannot be voided.
              Void the packing session first.
            </p>
          )}
        </div>
      )}
    </section>
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
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-on-surface-variant uppercase tracking-widest">
        {label}
      </span>
      {children}
    </label>
  );
}
