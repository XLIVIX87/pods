"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import QuantitySelector from "@/components/shared/QuantitySelector";
import { formatNaira, formatBottleSize, BOTTLE_SIZES } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  location: string | null;
  customerType: string;
  sales: {
    id: string;
    date: string;
    totalAmount: number;
    items: { bottleSizeMl: number; quantity: number }[];
    payments: { amountPaid: number; balanceOwed: number }[];
  }[];
  _count: { sales: number };
}

interface BottlePrice {
  id: string;
  bottleSizeMl: number;
  containerCost: number;
  currentCostPerUnit: number;
  selectedPrice: number;
  safePrice: number;
  goodPrice: number;
  strongPrice: number;
}

interface CartItem {
  bottleSizeMl: number;
  quantity: number;
  unitPrice: number;
  costPerUnit: number;
}

export default function SellPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Customers
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newLocation, setNewLocation] = useState("");

  // Products
  const [bottlePrices, setBottlePrices] = useState<BottlePrice[]>([]);
  const [cart, setCart] = useState<Map<number, CartItem>>(new Map());

  // Delivery
  const [deliveryMethod, setDeliveryMethod] = useState<"DELIVER" | "PICKUP">(
    "PICKUP"
  );

  // Fetch customers
  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then(setCustomers)
      .catch(console.error);
  }, []);

  // Fetch bottle pricing
  useEffect(() => {
    fetch("/api/bottle-pricing")
      .then((r) => r.json())
      .then((prices: BottlePrice[]) => {
        setBottlePrices(prices);
        // Initialize cart with zero quantities
        const initial = new Map<number, CartItem>();
        for (const size of BOTTLE_SIZES) {
          const pricing = prices.find(
            (p: BottlePrice) => p.bottleSizeMl === size
          );
          initial.set(size, {
            bottleSizeMl: size,
            quantity: 0,
            unitPrice: pricing?.selectedPrice || pricing?.goodPrice || 0,
            costPerUnit: pricing?.currentCostPerUnit || 0,
          });
        }
        setCart(initial);
      })
      .catch(console.error);
  }, []);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      (c.phone?.includes(customerSearch) ?? false) ||
      (c.location?.toLowerCase().includes(customerSearch.toLowerCase()) ?? false)
  );

  const handleAddCustomer = async () => {
    if (!newName) return;
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        phone: newPhone,
        location: newLocation,
      }),
    });
    const customer = await res.json();
    setCustomers((prev) => [customer, ...prev]);
    setSelectedCustomer(customer);
    setShowAddCustomer(false);
    setNewName("");
    setNewPhone("");
    setNewLocation("");
  };

  const updateCartQuantity = (sizeMl: number, quantity: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      const item = next.get(sizeMl);
      if (item) {
        next.set(sizeMl, { ...item, quantity });
      }
      return next;
    });
  };

  // Cart calculations
  const cartItems = Array.from(cart.values()).filter((i) => i.quantity > 0);
  const totalAmount = cartItems.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0
  );
  const totalCost = cartItems.reduce(
    (sum, i) => sum + i.costPerUnit * i.quantity,
    0
  );
  const profit = totalAmount - totalCost;
  const marginPct = totalAmount > 0 ? (profit / totalAmount) * 100 : 0;

  // Customer context
  const lastSale = selectedCustomer?.sales?.[0];
  const outstandingBalance =
    lastSale?.payments?.reduce((sum, p) => sum + p.balanceOwed, 0) ?? 0;
  const usualSizes = lastSale?.items?.map((i) => formatBottleSize(i.bottleSizeMl)).join(", ");

  const handleCompleteSale = async () => {
    if (!selectedCustomer || cartItems.length === 0) return;
    setLoading(true);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          deliveryMethod,
          deliveryCost: 0,
          items: cartItems.map((i) => ({
            bottleSizeMl: i.bottleSizeMl,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            costPerUnit: i.costPerUnit,
          })),
        }),
      });

      if (res.ok) {
        const sale = await res.json();
        router.push(`/money/${sale.id}`);
      }
    } catch (error) {
      console.error("Failed to save sale:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col pb-40">
      <TopBar title="Record a sale" showBack variant="page" />

      <main className="flex-grow px-4 pt-4 max-w-2xl mx-auto w-full">
        {/* Step 1: Customer Picker */}
        {step === 1 && (
          <section className="space-y-6">
            <h2 className="font-headline text-3xl font-semibold text-on-surface leading-tight">
              Who is buying?
            </h2>

            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                search
              </span>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-surface-container-lowest border-none ring-1 ring-outline/15 rounded-xl focus:ring-2 focus:ring-primary placeholder:text-on-surface-variant/50 text-lg transition-all"
                placeholder="Search customer name or phone..."
              />
            </div>

            {/* Customer List */}
            <div className="space-y-3">
              <p className="font-label text-xs font-bold text-outline uppercase tracking-wider">
                {customerSearch ? "Results" : "Recent customers"}
              </p>
              <div className="flex flex-wrap gap-3">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-full active:scale-95 transition-all ${
                      selectedCustomer?.id === customer.id
                        ? "bg-primary text-on-primary"
                        : "bg-tertiary-fixed hover:bg-tertiary-container/30"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined ${
                        selectedCustomer?.id === customer.id
                          ? "text-on-primary"
                          : "text-tertiary"
                      }`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      person
                    </span>
                    <span
                      className={`font-medium ${
                        selectedCustomer?.id === customer.id
                          ? "text-on-primary"
                          : "text-on-tertiary-fixed"
                      }`}
                    >
                      {customer.name}
                      {customer.location ? ` — ${customer.location}` : ""}
                    </span>
                  </button>
                ))}
              </div>

              {/* Add new customer */}
              {!showAddCustomer ? (
                <button
                  onClick={() => setShowAddCustomer(true)}
                  className="flex items-center gap-2 pt-2 text-success font-semibold active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    person_add
                  </span>
                  <span>Add new customer</span>
                </button>
              ) : (
                <div className="bg-surface-container-low p-4 rounded-xl space-y-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Customer name"
                    className="w-full h-12 px-4 bg-surface-container-lowest border-none ring-1 ring-outline/15 rounded-xl focus:ring-2 focus:ring-primary text-lg"
                  />
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Phone number"
                    className="w-full h-12 px-4 bg-surface-container-lowest border-none ring-1 ring-outline/15 rounded-xl focus:ring-2 focus:ring-primary text-lg"
                  />
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Location (e.g., Surulere)"
                    className="w-full h-12 px-4 bg-surface-container-lowest border-none ring-1 ring-outline/15 rounded-xl focus:ring-2 focus:ring-primary text-lg"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowAddCustomer(false)}
                      className="flex-1 h-12 bg-surface-container-highest text-on-surface-variant rounded-xl font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddCustomer}
                      disabled={!newName}
                      className="flex-1 h-12 bg-primary text-on-primary rounded-xl font-bold disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Customer Context Card */}
            {selectedCustomer && (
              <div className="bg-surface-container-low rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-lg">
                      person
                    </span>
                  </div>
                  <div>
                    <p className="font-body font-semibold text-on-surface">
                      {selectedCustomer.name}
                    </p>
                    <p className="font-label text-xs text-on-surface-variant">
                      {selectedCustomer._count?.sales || 0} previous orders
                      {selectedCustomer.customerType === "RETURNING" &&
                        " - Returning"}
                    </p>
                  </div>
                </div>

                {lastSale && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-outline-variant/10">
                    <div>
                      <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant font-bold block">
                        Last order
                      </span>
                      <span className="font-body text-sm text-on-surface">
                        {formatNaira(lastSale.totalAmount)}
                      </span>
                    </div>
                    {usualSizes && (
                      <div>
                        <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant font-bold block">
                          Usual sizes
                        </span>
                        <span className="font-body text-sm text-on-surface">
                          {usualSizes}
                        </span>
                      </div>
                    )}
                    {outstandingBalance > 0 && (
                      <div className="col-span-2">
                        <span className="font-label text-[10px] uppercase tracking-wider text-error font-bold block">
                          Outstanding balance
                        </span>
                        <span className="font-body text-sm text-error font-semibold">
                          {formatNaira(outstandingBalance)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Step 2: Product Selector */}
        {step === 2 && (
          <section className="space-y-6">
            <div className="mb-4">
              <h2 className="font-headline text-3xl font-semibold text-on-surface leading-tight">
                What are they buying?
              </h2>
              <p className="text-on-surface-variant font-body italic text-lg opacity-80 mt-1">
                Selling to {selectedCustomer?.name}
              </p>
            </div>

            <div className="space-y-4">
              {BOTTLE_SIZES.map((size) => {
                const pricing = bottlePrices.find(
                  (p) => p.bottleSizeMl === size
                );
                const cartItem = cart.get(size);
                const price =
                  pricing?.selectedPrice || pricing?.goodPrice || 0;

                return (
                  <div
                    key={size}
                    className={`bg-surface-container-low rounded-xl p-4 transition-all ${
                      (cartItem?.quantity ?? 0) > 0
                        ? "ring-2 ring-primary/30"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary text-lg">
                            local_drink
                          </span>
                          <span className="font-body font-semibold text-on-surface text-lg">
                            {formatBottleSize(size)}
                          </span>
                        </div>
                        {price > 0 && (
                          <p className="font-label text-sm text-on-surface-variant mt-1 ml-7">
                            {formatNaira(price)} each
                          </p>
                        )}
                      </div>
                      <QuantitySelector
                        value={cartItem?.quantity ?? 0}
                        onChange={(qty) => updateCartQuantity(size, qty)}
                        min={0}
                        max={100}
                        size="sm"
                      />
                    </div>
                    {(cartItem?.quantity ?? 0) > 0 && price > 0 && (
                      <div className="mt-2 ml-7 font-label text-sm text-primary font-semibold">
                        = {formatNaira(price * (cartItem?.quantity ?? 0))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Running totals card */}
            {cartItems.length > 0 && (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-tertiary-fixed to-primary-fixed/30 p-6 shadow-sm">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                <div className="relative z-10 space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-xs font-label uppercase tracking-widest text-on-tertiary-fixed-variant block mb-1 font-bold">
                        Total
                      </span>
                      <div className="text-3xl font-headline font-bold text-on-primary-fixed">
                        {formatNaira(totalAmount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-label uppercase tracking-widest text-on-tertiary-fixed-variant block mb-1 font-bold">
                        Profit
                      </span>
                      <div className="text-2xl font-headline font-semibold text-on-primary-fixed-variant italic">
                        {formatNaira(profit)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-on-tertiary-fixed-variant/10">
                    <span className="font-label text-xs text-on-tertiary-fixed-variant font-bold">
                      Margin: {marginPct.toFixed(1)}%
                    </span>
                    <span className="font-label text-xs text-on-tertiary-fixed-variant">
                      ({cartItems.reduce((sum, i) => sum + i.quantity, 0)}{" "}
                      bottles)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Method */}
            <div className="space-y-3">
              <p className="font-label text-xs font-bold text-outline uppercase tracking-wider">
                Delivery method
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeliveryMethod("DELIVER")}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-medium transition-all active:scale-95 ${
                    deliveryMethod === "DELIVER"
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-low text-on-surface-variant"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    local_shipping
                  </span>
                  <span className="font-body font-semibold">We deliver</span>
                </button>
                <button
                  onClick={() => setDeliveryMethod("PICKUP")}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-medium transition-all active:scale-95 ${
                    deliveryMethod === "PICKUP"
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-low text-on-surface-variant"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    store
                  </span>
                  <span className="font-body font-semibold">
                    Customer pickup
                  </span>
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Fixed Bottom Bar */}
      <footer className="fixed bottom-0 left-0 w-full bg-surface/90 backdrop-blur-md z-50 border-t border-on-surface/5">
        <div className="max-w-2xl mx-auto p-4">
          {/* Show totals when on step 2 with items */}
          {step === 2 && cartItems.length > 0 && (
            <div className="flex justify-between items-center mb-3 px-1">
              <div>
                <span className="font-label text-xs text-on-surface-variant uppercase tracking-wider font-bold block">
                  Total
                </span>
                <span className="font-headline text-2xl font-bold text-on-surface">
                  {formatNaira(totalAmount)}
                </span>
              </div>
              <div className="text-right">
                <span className="font-label text-xs text-on-surface-variant uppercase tracking-wider font-bold block">
                  Profit
                </span>
                <span className="font-headline text-xl font-semibold text-success italic">
                  {formatNaira(profit)}{" "}
                  <span className="text-sm font-normal">
                    ({marginPct.toFixed(0)}%)
                  </span>
                </span>
              </div>
            </div>
          )}

          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={!selectedCustomer}
              className="w-full h-16 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-xl rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Next: Choose Products
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={handleCompleteSale}
              disabled={loading || cartItems.length === 0}
              className="w-full h-16 bg-gradient-to-r from-primary to-secondary text-white font-bold text-xl rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                "Saving..."
              ) : (
                <>
                  <span className="material-symbols-outlined">
                    check_circle
                  </span>
                  Complete Sale
                </>
              )}
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
