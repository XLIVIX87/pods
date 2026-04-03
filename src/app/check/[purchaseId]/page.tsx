"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";
import { formatNaira, formatDate } from "@/lib/utils";

interface Purchase {
  id: string;
  kegs: number;
  totalCost: number;
  date: string;
  supplier: { name: string; location: string | null };
}

interface QualityTest {
  key: string;
  label: string;
  question: string;
  value: boolean | null;
}

export default function QualityCheckPage({
  params,
}: {
  params: Promise<{ purchaseId: string }>;
}) {
  const { purchaseId } = use(params);
  const router = useRouter();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [showNoteField, setShowNoteField] = useState(false);

  const [tests, setTests] = useState<QualityTest[]>([
    { key: "colour", label: "Colour", question: "Is it a good red-orange?", value: null },
    { key: "smell", label: "Smell", question: "Does it smell fresh?", value: null },
    { key: "taste", label: "Taste", question: "Does it taste right?", value: null },
    { key: "water", label: "Water", question: "Any water at the bottom?", value: null },
  ]);

  useEffect(() => {
    fetch(`/api/purchases`)
      .then((r) => r.json())
      .then((purchases: Purchase[]) => {
        const p = purchases.find((p: Purchase) => p.id === purchaseId);
        if (p) setPurchase(p);
      })
      .catch(console.error);
  }, [purchaseId]);

  const setTestValue = (key: string, value: boolean) => {
    setTests((prev) =>
      prev.map((t) => (t.key === key ? { ...t, value } : t))
    );
  };

  const handleDecision = async (result: "ACCEPT" | "REJECT" | "ACCEPT_WITH_NOTE") => {
    if (result === "ACCEPT_WITH_NOTE" && !showNoteField) {
      setShowNoteField(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/quality-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseId,
          colourPass: tests.find((t) => t.key === "colour")?.value,
          smellPass: tests.find((t) => t.key === "smell")?.value,
          tastePass: tests.find((t) => t.key === "taste")?.value,
          waterPass: tests.find((t) => t.key === "water")?.value === false, // "No water" = pass
          result,
          note: result === "ACCEPT_WITH_NOTE" ? note : null,
        }),
      });

      if (res.ok) {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to save quality check:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!purchase) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="text-on-surface-variant">Loading purchase details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-32">
      <TopBar title="Is the oil good?" showBack variant="page" />

      <main className="px-6 py-8 max-w-lg mx-auto">
        {/* Context */}
        <div className="mb-8">
          <h1 className="text-4xl font-headline font-bold text-on-surface leading-tight mb-3">
            Is the oil good?
          </h1>
          <div className="inline-flex items-center bg-surface-container-low px-4 py-1.5 rounded-full">
            <span className="text-sm font-medium text-primary">
              {purchase.kegs} kegs from {purchase.supplier.name} —{" "}
              {formatDate(purchase.date)}
            </span>
          </div>
        </div>

        {/* Quality Tests */}
        <div className="space-y-4 mb-10">
          {tests.map((test) => (
            <div
              key={test.key}
              className="bg-surface-container-lowest p-5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex justify-between items-center"
            >
              <div>
                <p className="font-bold text-lg leading-none">{test.label}</p>
                <p className="text-on-surface-variant text-sm mt-1">
                  {test.question}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setTestValue(test.key, true)}
                  className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 active:scale-90 ${
                    test.value === true
                      ? "bg-success text-white border-success"
                      : "border-success/20 text-success hover:bg-success hover:text-white"
                  }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'wght' 700" }}
                  >
                    check
                  </span>
                </button>
                <button
                  onClick={() => setTestValue(test.key, false)}
                  className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 active:scale-90 ${
                    test.value === false
                      ? "bg-error text-white border-error"
                      : "border-error/20 text-error hover:bg-error hover:text-white"
                  }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'wght' 700" }}
                  >
                    close
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Note Field */}
        {showNoteField && (
          <div className="mb-8 space-y-3">
            <label className="block text-sm font-bold text-on-surface-variant uppercase tracking-wide">
              What&apos;s the issue?
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Describe what you noticed..."
              rows={3}
              className="w-full p-4 bg-surface-container-lowest border-none ring-1 ring-outline/15 rounded-xl focus:ring-2 focus:ring-primary text-lg resize-none"
            />
          </div>
        )}

        {/* Decision Section */}
        <div className="pt-6 border-t border-outline-variant/20 mb-8">
          <h2 className="text-2xl font-headline font-bold mb-6">
            Your decision:
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <button
              onClick={() => handleDecision("ACCEPT")}
              disabled={loading}
              className="w-full bg-success text-white py-5 rounded-xl font-bold text-lg shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <span className="material-symbols-outlined">verified</span>
              Accept — oil is good
            </button>
            <button
              onClick={() => handleDecision("ACCEPT_WITH_NOTE")}
              disabled={loading}
              className="w-full bg-primary-container text-on-primary-container py-5 rounded-xl font-bold text-lg shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <span className="material-symbols-outlined">edit_note</span>
              {showNoteField ? "Save with note" : "Accept with note"}
            </button>
            <button
              onClick={() => handleDecision("REJECT")}
              disabled={loading}
              className="w-full bg-error text-white py-5 rounded-xl font-bold text-lg shadow-md active:scale-[0.98] transition-transform flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <span className="material-symbols-outlined">backspace</span>
              Reject — send back
            </button>
          </div>
        </div>

        {/* Optional Camera */}
        <button className="w-full flex items-center justify-center gap-3 py-4 text-primary font-medium border-2 border-primary/10 rounded-full bg-surface-container-low hover:bg-surface-container-high transition-colors active:scale-[0.98]">
          <span className="material-symbols-outlined">photo_camera</span>
          Take a photo of the oil (optional)
        </button>
      </main>

      <BottomNav />
    </div>
  );
}
