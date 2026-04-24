"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import CurrencyInput from "@/components/shared/CurrencyInput";
import {
  formatNaira,
  formatBottleSize,
  whatsappLink,
  formatDate,
} from "@/lib/utils";

interface SaleItem {
  id: string;
  bottleSizeMl: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface SalePayment {
  id: string;
  amountPaid: number;
  balanceOwed: number;
  paymentStatus: string;
  paymentMethod: string;
  paidAt: string;
  expectedPaymentDate: string | null;
}

interface Sale {
  id: string;
  date: string;
  totalAmount: number;
  totalCost: number;
  profit: number;
  marginPct: number;
  deliveryMethod: string;
  deliveryCost: number;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    location: string | null;
  };
  items: SaleItem[];
  payments: SalePayment[];
}

export default function MoneyPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId } = use(params);
  const router = useRouter();

  const [sale, setSale] = useState<Sale | null>(null);
  const [loadingSale, setLoadingSale] = useState(true);
  const [saving, setSaving] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  const handleVoidSale = async () => {
    const reason = window.prompt(
      "Why are you voiding this sale? (e.g. entered wrong amount, wrong customer)"
    );
    if (reason === null) return; // cancelled
    if (!reason.trim()) {
      setVoidError("A reason is required to void a sale.");
      return;
    }
    setVoiding(true);
    setVoidError(null);
    try {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to void sale");
      }
      router.push("/money");
    } catch (err) {
      setVoidError(err instanceof Error ? err.message : "Failed");
      setVoiding(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const reason = window.prompt(
      "Why are you removing this payment? (optional)"
    );
    if (reason === null) return;
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      // Refresh the sale
      const fresh = await fetch(`/api/sales/${saleId}`).then((r) => r.json());
      setSale(fresh);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete payment");
    }
  };

  // Payment form
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "TRANSFER" | "POS"
  >("CASH");
  const [expectedPaymentDate, setExpectedPaymentDate] = useState("");

  // Fetch sale details
  useEffect(() => {
    fetch(`/api/sales/${saleId}`)
      .then((r) => r.json())
      .then((data) => {
        setSale(data);
        const paidSoFar =
          data.payments?.reduce(
            (sum: number, p: SalePayment) => sum + p.amountPaid,
            0
          ) ?? 0;
        // Default to the remaining balance so it's easy to mark "paid in full"
        setAmountPaid(Math.max(0, data.totalAmount - paidSoFar));
      })
      .catch(console.error)
      .finally(() => setLoadingSale(false));
  }, [saleId]);

  if (loadingSale) {
    return (
      <div className="min-h-dvh flex flex-col">
        <TopBar title="Record payment" showBack variant="page" />
        <div className="flex-grow flex items-center justify-center">
          <p className="text-on-surface-variant font-body">Loading...</p>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-dvh flex flex-col">
        <TopBar title="Record payment" showBack variant="page" />
        <div className="flex-grow flex items-center justify-center">
          <p className="text-on-surface-variant font-body">Sale not found</p>
        </div>
      </div>
    );
  }

  const alreadyPaid = sale.payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalOwed = sale.totalAmount - alreadyPaid;
  const balanceAfterPayment = Math.max(0, totalOwed - amountPaid);

  const handleQuickSelect = (type: "full" | "half" | "none") => {
    if (type === "full") setAmountPaid(totalOwed);
    else if (type === "half") setAmountPaid(Math.round(totalOwed / 2));
    else setAmountPaid(0);
  };

  const handleSavePayment = async () => {
    if (!sale) return;
    setSaving(true);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: sale.id,
          amountPaid,
          paymentMethod,
          expectedPaymentDate: expectedPaymentDate || null,
        }),
      });

      if (res.ok) {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to save payment:", error);
    } finally {
      setSaving(false);
    }
  };

  // Build WhatsApp reminder message
  const reminderMessage = `Hi ${sale.customer.name}, this is a reminder about your outstanding balance of ${formatNaira(balanceAfterPayment)} for your palm oil order on ${formatDate(sale.date)}. Thank you!`;

  // Profit breakdown (estimate from sale data)
  const totalBottles = sale.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="min-h-dvh flex flex-col pb-32">
      <TopBar title="Record payment" showBack variant="page" />

      <main className="flex-grow px-4 pt-4 max-w-2xl mx-auto w-full space-y-6">
        {/* Context Card */}
        <div className="bg-surface-container-low rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-container flex items-center justify-center">
              <span
                className="material-symbols-outlined text-primary text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                person
              </span>
            </div>
            <div className="flex-1">
              <p className="font-body font-semibold text-on-surface text-lg">
                {sale.customer.name}
              </p>
              <p className="font-label text-xs text-on-surface-variant">
                {formatDate(sale.date)} &middot;{" "}
                {sale.deliveryMethod === "DELIVER" ? "Delivered" : "Pickup"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-outline-variant/10">
            <div>
              <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant font-bold block">
                Items
              </span>
              <span className="font-body text-sm text-on-surface">
                {sale.items
                  .map(
                    (i) =>
                      `${i.quantity}x ${formatBottleSize(i.bottleSizeMl)}`
                  )
                  .join(", ")}
              </span>
            </div>
            <div className="text-right">
              <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant font-bold block">
                Total amount
              </span>
              <span className="font-headline text-xl font-bold text-on-surface">
                {formatNaira(sale.totalAmount)}
              </span>
            </div>
          </div>

          {alreadyPaid > 0 && (
            <div className="pt-2 border-t border-outline-variant/10">
              <span className="font-label text-[10px] uppercase tracking-wider text-success font-bold block">
                Already paid
              </span>
              <span className="font-body text-sm text-success font-semibold">
                {formatNaira(alreadyPaid)} &middot; Still owes{" "}
                {formatNaira(totalOwed)}
              </span>
            </div>
          )}
        </div>

        {/* Payment History */}
        {sale.payments.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="font-label text-xs font-bold text-outline uppercase tracking-wider">
                Payment history
              </p>
              <span className="font-label text-xs text-on-surface-variant">
                {sale.payments.length} payment
                {sale.payments.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-2">
              {[...sale.payments]
                .sort(
                  (a, b) =>
                    new Date(a.paidAt).getTime() -
                    new Date(b.paidAt).getTime()
                )
                .map((p) => (
                  <div
                    key={p.id}
                    className="bg-surface-container-low rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-success-light flex items-center justify-center">
                        <span className="material-symbols-outlined text-success text-lg">
                          {p.paymentMethod === "CASH"
                            ? "payments"
                            : p.paymentMethod === "TRANSFER"
                              ? "swap_horiz"
                              : "credit_card"}
                        </span>
                      </div>
                      <div>
                        <p className="font-body font-semibold text-on-surface">
                          {formatNaira(p.amountPaid)}
                        </p>
                        <p className="font-label text-xs text-on-surface-variant">
                          {p.paymentMethod} &middot; {formatDate(p.paidAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          p.paymentStatus === "PAID"
                            ? "bg-success-light text-success"
                            : p.paymentStatus === "PART"
                              ? "bg-tertiary-fixed text-on-tertiary-fixed"
                              : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {p.paymentStatus}
                      </span>
                      <button
                        onClick={() => handleDeletePayment(p.id)}
                        className="p-1 text-on-surface-variant active:bg-surface-container-high rounded"
                        aria-label="Remove payment"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-base">
                          delete_outline
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Payment Input */}
        {totalOwed > 0 ? (
          <div className="space-y-1">
            <p className="font-label text-xs font-bold text-outline uppercase tracking-wider mb-2">
              Record new payment
            </p>
            <CurrencyInput
              value={amountPaid}
              onChange={setAmountPaid}
              label="Amount paid"
              size="lg"
            />
          </div>
        ) : (
          <div className="bg-success-light border border-success/20 rounded-xl p-5 flex items-center gap-3">
            <span
              className="material-symbols-outlined text-success text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <div>
              <p className="font-body font-semibold text-success">
                Sale fully paid
              </p>
              <p className="font-label text-xs text-success/70">
                All balances settled.
              </p>
            </div>
          </div>
        )}

        {/* Quick Select Buttons */}
        {totalOwed > 0 && (
        <div className="flex gap-3">
          <button
            onClick={() => handleQuickSelect("full")}
            className={`flex-1 py-3 rounded-xl font-body font-semibold text-sm transition-all active:scale-95 ${
              amountPaid === totalOwed
                ? "bg-primary text-on-primary"
                : "bg-surface-container-low text-on-surface-variant"
            }`}
          >
            Paid in full
          </button>
          <button
            onClick={() => handleQuickSelect("half")}
            className={`flex-1 py-3 rounded-xl font-body font-semibold text-sm transition-all active:scale-95 ${
              amountPaid === Math.round(totalOwed / 2)
                ? "bg-primary text-on-primary"
                : "bg-surface-container-low text-on-surface-variant"
            }`}
          >
            Half
          </button>
          <button
            onClick={() => handleQuickSelect("none")}
            className={`flex-1 py-3 rounded-xl font-body font-semibold text-sm transition-all active:scale-95 ${
              amountPaid === 0
                ? "bg-primary text-on-primary"
                : "bg-surface-container-low text-on-surface-variant"
            }`}
          >
            No payment yet
          </button>
        </div>
        )}

        {/* Payment Method */}
        {totalOwed > 0 && (
        <div className="space-y-3">
          <p className="font-label text-xs font-bold text-outline uppercase tracking-wider">
            Payment method
          </p>
          <div className="flex gap-3">
            {(["CASH", "TRANSFER", "POS"] as const).map((method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`flex-1 py-3 rounded-full font-body font-semibold text-sm transition-all active:scale-95 ${
                  paymentMethod === method
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-low text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-base align-middle mr-1">
                  {method === "CASH"
                    ? "payments"
                    : method === "TRANSFER"
                    ? "swap_horiz"
                    : "credit_card"}
                </span>
                {method === "CASH"
                  ? "Cash"
                  : method === "TRANSFER"
                  ? "Transfer"
                  : "POS"}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Balance Owed & Expected Payment Date */}
        {balanceAfterPayment > 0 && (
          <div className="bg-error-container/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-error">
                warning
              </span>
              <div>
                <p className="font-body font-semibold text-error text-lg">
                  {formatNaira(balanceAfterPayment)} still owed
                </p>
                <p className="font-label text-xs text-on-error-container/70">
                  Customer will owe this amount after this payment
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-label uppercase tracking-widest text-on-surface-variant mb-2 ml-1 font-semibold">
                When will they pay?
              </label>
              <input
                type="date"
                value={expectedPaymentDate}
                onChange={(e) => setExpectedPaymentDate(e.target.value)}
                className="w-full h-12 px-4 bg-surface-container-lowest border-none ring-1 ring-outline/15 rounded-xl focus:ring-2 focus:ring-primary text-lg font-body"
              />
            </div>

            {/* WhatsApp Reminder */}
            {sale.customer.phone && (
              <a
                href={whatsappLink(sale.customer.phone, reminderMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#25D366] text-white rounded-xl font-body font-semibold active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-lg">chat</span>
                Send WhatsApp reminder
              </a>
            )}
          </div>
        )}

        {/* Profit Breakdown */}
        <div className="bg-surface-container-low rounded-xl p-5 space-y-3">
          <p className="font-label text-xs font-bold text-outline uppercase tracking-wider">
            Profit breakdown
          </p>

          <div className="space-y-2">
            <div className="flex justify-between font-body text-sm">
              <span className="text-on-surface-variant">
                Cost of goods ({totalBottles} bottles)
              </span>
              <span className="text-on-surface font-medium">
                {formatNaira(sale.totalCost - sale.deliveryCost)}
              </span>
            </div>
            {sale.deliveryCost > 0 && (
              <div className="flex justify-between font-body text-sm">
                <span className="text-on-surface-variant">
                  Delivery / transport
                </span>
                <span className="text-on-surface font-medium">
                  {formatNaira(sale.deliveryCost)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-body text-sm pt-2 border-t border-outline-variant/10">
              <span className="text-on-surface-variant font-semibold">
                Total cost
              </span>
              <span className="text-on-surface font-semibold">
                {formatNaira(sale.totalCost)}
              </span>
            </div>
            <div className="flex justify-between font-body text-sm">
              <span className="text-on-surface-variant">Sell price</span>
              <span className="text-on-surface font-medium">
                {formatNaira(sale.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between font-body text-base pt-2 border-t border-outline-variant/10">
              <span className="text-on-surface font-bold">Profit</span>
              <span className="text-success font-headline font-bold text-lg">
                {formatNaira(sale.profit)}{" "}
                <span className="text-sm font-normal text-on-surface-variant">
                  ({sale.marginPct.toFixed(1)}%)
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Danger zone — void sale */}
        <div className="bg-error-container/20 border border-error/20 rounded-xl p-5 space-y-3">
          <p className="font-label text-xs font-bold uppercase tracking-wider text-error">
            Danger zone
          </p>
          <p className="text-sm text-on-surface-variant">
            Voiding this sale will reverse the stock decrement and hide it from
            all lists. Payments on the sale are kept for the audit trail but
            will no longer affect the books.
          </p>
          {voidError && (
            <p className="text-sm text-error font-medium">{voidError}</p>
          )}
          <button
            onClick={handleVoidSale}
            disabled={voiding}
            type="button"
            className="w-full h-12 rounded-xl bg-error-container text-on-error-container font-bold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">
              cancel
            </span>
            {voiding ? "Voiding…" : "Void this sale"}
          </button>
        </div>
      </main>

      {/* Fixed Footer */}
      <footer className="fixed bottom-0 left-0 w-full bg-surface/90 backdrop-blur-md z-50 border-t border-on-surface/5">
        <div className="max-w-2xl mx-auto p-4">
          {totalOwed > 0 ? (
            <button
              onClick={handleSavePayment}
              disabled={saving}
              className="w-full h-16 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xl rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                "Saving..."
              ) : (
                <>
                  <span className="material-symbols-outlined">check_circle</span>
                  Save Payment
                </>
              )}
            </button>
          ) : (
            <button
              onClick={() => router.push("/")}
              className="w-full h-16 bg-surface-container-high text-on-surface font-bold text-xl rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">home</span>
              Back to Home
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
