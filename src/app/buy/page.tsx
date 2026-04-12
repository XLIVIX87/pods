"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import StepperProgress from "@/components/shared/StepperProgress";
import QuantitySelector from "@/components/shared/QuantitySelector";
import CurrencyInput from "@/components/shared/CurrencyInput";
import { formatNaira } from "@/lib/utils";

interface Supplier {
  id: string;
  name: string;
  location: string | null;
  phone: string | null;
}

export default function BuyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);

  // Step 1: Supplier
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierLocation, setNewSupplierLocation] = useState("");

  // Step 2: Kegs & Price
  const [kegs, setKegs] = useState(10);
  const [pricePerKeg, setPricePerKeg] = useState(0);
  const [transportCost, setTransportCost] = useState(0);

  // Calculated values
  const totalCost = kegs * pricePerKeg + transportCost;
  const totalLitres = kegs * 25;
  const costPerLitre = totalLitres > 0 ? totalCost / totalLitres : 0;

  useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then(setSuppliers)
      .catch(console.error);
  }, []);

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      (s.location?.toLowerCase().includes(supplierSearch.toLowerCase()) ?? false)
  );

  const handleAddSupplier = async () => {
    if (!newSupplierName) return;
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newSupplierName,
        location: newSupplierLocation,
      }),
    });
    const supplier = await res.json();
    setSuppliers((prev) => [supplier, ...prev]);
    setSelectedSupplier(supplier);
    setShowAddSupplier(false);
    setNewSupplierName("");
    setNewSupplierLocation("");
  };

  const handleSavePurchase = async () => {
    if (!selectedSupplier || kegs <= 0 || pricePerKeg <= 0) return;
    setLoading(true);

    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: selectedSupplier.id,
          kegs,
          kegSizeLitres: 25,
          pricePerKeg,
          transportCost,
        }),
      });

      if (res.ok) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to save purchase:", error);
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep1 = selectedSupplier !== null;
  const canProceedStep2 = kegs > 0 && pricePerKeg > 0;

  return (
    <div className="min-h-dvh flex flex-col pb-24">
      <TopBar title="I bought oil today" showBack variant="page" />

      <main className="flex-grow px-4 pt-4 max-w-2xl mx-auto w-full">
        <StepperProgress currentStep={step} totalSteps={3} />

        {/* Step 1: Supplier Selection */}
        {step === 1 && (
          <section className="space-y-6">
            <h2 className="font-headline text-3xl font-semibold text-on-surface leading-tight">
              Who did you buy from?
            </h2>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                search
              </span>
              <input
                type="text"
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-surface-container-lowest border-none ring-1 ring-outline/15 rounded-xl focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant/50 text-lg transition-all"
                placeholder="Search for a name..."
              />
            </div>

            <div className="space-y-3">
              <p className="font-label text-xs font-bold text-outline uppercase tracking-wider">
                {supplierSearch ? "Results" : "Recent Sellers"}
              </p>
              <div className="flex flex-wrap gap-3">
                {filteredSuppliers.map((supplier) => (
                  <button
                    key={supplier.id}
                    onClick={() => setSelectedSupplier(supplier)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-full active:scale-95 transition-all ${
                      selectedSupplier?.id === supplier.id
                        ? "bg-primary text-on-primary"
                        : "bg-tertiary-fixed hover:bg-tertiary-container/30"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined ${
                        selectedSupplier?.id === supplier.id
                          ? "text-on-primary"
                          : "text-tertiary"
                      }`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      person
                    </span>
                    <span
                      className={`font-medium ${
                        selectedSupplier?.id === supplier.id
                          ? "text-on-primary"
                          : "text-on-tertiary-fixed"
                      }`}
                    >
                      {supplier.name}
                      {supplier.location ? ` — ${supplier.location}` : ""}
                    </span>
                  </button>
                ))}
              </div>

              {!showAddSupplier ? (
                <button
                  onClick={() => setShowAddSupplier(true)}
                  className="flex items-center gap-2 pt-2 text-success font-semibold active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    person_add
                  </span>
                  <span>Add new supplier</span>
                </button>
              ) : (
                <div className="bg-surface-container-low p-4 rounded-xl space-y-3">
                  <input
                    type="text"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="Supplier name"
                    className="w-full h-12 px-4 bg-surface-container-lowest border-none ring-1 ring-outline/15 rounded-xl focus:ring-2 focus:ring-primary text-lg"
                  />
                  <input
                    type="text"
                    value={newSupplierLocation}
                    onChange={(e) => setNewSupplierLocation(e.target.value)}
                    placeholder="Location (e.g., Calabar)"
                    className="w-full h-12 px-4 bg-surface-container-lowest border-none ring-1 ring-outline/15 rounded-xl focus:ring-2 focus:ring-primary text-lg"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddSupplier(false)}
                      className="flex-1 h-12 bg-surface-container-highest text-on-surface-variant rounded-xl font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddSupplier}
                      disabled={!newSupplierName}
                      className="flex-1 h-12 bg-primary text-on-primary rounded-xl font-bold disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Step 2: Kegs & Price */}
        {step === 2 && (
          <section className="space-y-8">
            <div className="text-center mb-10">
              <h2 className="font-headline text-3xl font-semibold text-on-surface leading-tight mb-2">
                How many kegs, and how much?
              </h2>
              <p className="text-on-surface-variant font-body italic text-lg opacity-80">
                Buying from {selectedSupplier?.name}
              </p>
            </div>

            <div className="flex flex-col items-center">
              <label className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-6 font-semibold">
                Number of kegs
              </label>
              <div className="bg-surface-container-low p-4 rounded-xl w-full flex justify-center">
                <QuantitySelector
                  value={kegs}
                  onChange={setKegs}
                  min={1}
                  max={100}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <CurrencyInput
                value={pricePerKeg}
                onChange={setPricePerKeg}
                label="Price per keg"
                size="lg"
              />
              <CurrencyInput
                value={transportCost}
                onChange={setTransportCost}
                label="Transport cost"
                size="md"
              />
            </div>

            {/* Summary Card */}
            {pricePerKeg > 0 && (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-tertiary-fixed to-primary-fixed/30 p-8 shadow-sm">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <span className="text-xs font-label uppercase tracking-widest text-on-tertiary-fixed-variant block mb-1 font-bold">
                      Total cost
                    </span>
                    <div className="text-4xl font-headline font-bold text-on-primary-fixed">
                      {formatNaira(totalCost)}
                    </div>
                  </div>
                  <div className="border-l border-on-tertiary-fixed-variant/10 pl-6">
                    <span className="text-xs font-label uppercase tracking-widest text-on-tertiary-fixed-variant block mb-1 font-bold">
                      Cost per litre
                    </span>
                    <div className="text-3xl font-headline font-semibold text-on-primary-fixed-variant italic">
                      {formatNaira(Math.round(costPerLitre))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Step 3: Photo */}
        {step === 3 && (
          <section className="flex-grow flex flex-col items-center justify-center text-center space-y-8">
            <h2 className="font-headline text-3xl font-bold text-on-surface tracking-tight leading-tight">
              Take a photo of the delivery
            </h2>

            <div className="relative">
              <div className="absolute -inset-4 bg-surface-container-low rounded-full opacity-50 blur-xl" />
              <button className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shadow-xl active:scale-90 transition-all duration-300">
                <span
                  className="material-symbols-outlined text-white text-5xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  photo_camera
                </span>
              </button>
            </div>
            <p className="text-on-surface-variant font-body text-lg font-medium max-w-[200px]">
              Snap one photo of the kegs
            </p>

            <button className="flex items-center gap-3 px-6 py-4 bg-surface-container-high hover:bg-surface-container-highest transition-colors rounded-xl w-full border border-outline-variant/15">
              <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary">
                  receipt_long
                </span>
              </div>
              <div className="flex flex-col items-start">
                <span className="font-label text-sm font-semibold text-on-surface">
                  Add waybill photo
                </span>
                <span className="font-label text-xs text-on-surface-variant/80">
                  Optional document capture
                </span>
              </div>
              <span className="material-symbols-outlined ml-auto text-outline">
                add_circle
              </span>
            </button>

            <div className="bg-tertiary-fixed px-4 py-1.5 rounded-full flex items-center gap-2 mt-8">
              <span
                className="material-symbols-outlined text-on-tertiary-fixed text-sm"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified
              </span>
              <span className="font-label text-[10px] uppercase font-bold tracking-tighter text-on-tertiary-fixed">
                Trusted Delivery Verification
              </span>
            </div>
          </section>
        )}
      </main>

      {/* Fixed Footer Action */}
      <footer className="fixed bottom-0 left-0 w-full p-4 bg-surface/90 backdrop-blur-md z-50">
        <div className="max-w-2xl mx-auto">
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2)
              }
              className="w-full h-16 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-xl rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Next Step
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={handleSavePurchase}
              disabled={loading}
              className="w-full h-16 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xl rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Saving..." : "Save Purchase"}
            </button>
          )}

          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="w-full mt-2 py-3 text-on-surface-variant font-medium text-sm"
            >
              Go back
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
