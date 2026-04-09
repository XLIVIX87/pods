import Link from "next/link";
import { notFound } from "next/navigation";
import BottomNav from "@/components/layout/BottomNav";
import TopBar from "@/components/layout/TopBar";
import { prisma } from "@/lib/prisma";
import {
  formatNaira,
  formatBottleSize,
  timeAgo,
  formatDate,
  whatsappLink,
} from "@/lib/utils";

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

async function getCustomerDetail(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        include: {
          items: true,
          payments: true,
        },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!customer) return null;

  const totalSpent = customer.sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalOrders = customer.sales.length;
  const avgOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;

  // Outstanding balance
  const outstanding = customer.sales.reduce((sum, s) => {
    return sum + s.payments.reduce((ps, p) => ps + p.balanceOwed, 0);
  }, 0);

  // Payment reliability: % of sales fully paid
  const salesWithPayments = customer.sales.filter((s) => s.payments.length > 0);
  const paidOnTime = salesWithPayments.filter((s) =>
    s.payments.every((p) => p.paymentStatus === "PAID")
  ).length;
  const reliabilityPct =
    salesWithPayments.length > 0
      ? Math.round((paidOnTime / salesWithPayments.length) * 100)
      : 100;

  // Usually buys: aggregate product sizes
  const productFrequency: Record<number, number> = {};
  customer.sales.forEach((s) =>
    s.items.forEach((item) => {
      productFrequency[item.bottleSizeMl] =
        (productFrequency[item.bottleSizeMl] || 0) + item.quantity;
    })
  );
  const usualProducts = Object.entries(productFrequency)
    .map(([sizeMl, qty]) => ({ sizeMl: Number(sizeMl), qty }))
    .sort((a, b) => b.qty - a.qty);

  // Recent orders (last 10)
  const recentOrders = customer.sales.slice(0, 10).map((s) => {
    const paid = s.payments.reduce((sum, p) => sum + p.amountPaid, 0);
    const owed = s.payments.reduce((sum, p) => sum + p.balanceOwed, 0);
    const status =
      owed > 0 ? (paid > 0 ? "PART" : "OWED") : "PAID";
    return {
      id: s.id,
      date: s.date,
      totalAmount: s.totalAmount,
      items: s.items,
      status,
      owed,
    };
  });

  return {
    ...customer,
    totalSpent,
    totalOrders,
    avgOrder,
    outstanding,
    reliabilityPct,
    usualProducts,
    recentOrders,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerDetail(id);

  if (!customer) notFound();

  const reliabilityDots = 10;
  const filledDots = Math.round((customer.reliabilityPct / 100) * reliabilityDots);

  const statusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-success-light text-success";
      case "PART":
        return "bg-tertiary-fixed text-on-tertiary-fixed";
      case "OWED":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-surface-container-high text-on-surface-variant";
    }
  };

  return (
    <div className="min-h-dvh pb-36">
      <TopBar variant="page" showBack title="Customer" />

      <main className="px-6 space-y-6 mt-2">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl font-label ${getAvatarColor(
              customer.name
            )}`}
          >
            {getInitials(customer.name)}
          </div>
          <div>
            <h2 className="text-2xl font-headline font-bold italic text-on-surface">
              {customer.name}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-1 text-on-surface-variant text-sm">
              {customer.location && (
                <span className="flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-sm">
                    location_on
                  </span>
                  {customer.location}
                </span>
              )}
              {customer.phone && (
                <span className="flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-sm">phone</span>
                  {customer.phone}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {customer.phone && (
            <div className="flex items-center gap-3">
              <a
                href={`tel:${customer.phone}`}
                className="flex items-center gap-2 bg-surface-container-high text-on-surface px-5 py-2.5 rounded-full font-label font-semibold text-sm active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-lg">call</span>
                Call
              </a>
              <a
                href={whatsappLink(
                  customer.phone,
                  `Hi ${customer.name.split(" ")[0]}!`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-success text-white px-5 py-2.5 rounded-full font-label font-semibold text-sm active:scale-95 transition-transform"
              >
                <span className="material-symbols-outlined text-lg">chat</span>
                WhatsApp
              </a>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-container-low rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-on-surface">
              {customer.totalOrders}
            </p>
            <p className="text-xs text-on-surface-variant font-label mt-1">
              Total Orders
            </p>
          </div>
          <div className="bg-surface-container-low rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-on-surface">
              {formatNaira(customer.totalSpent)}
            </p>
            <p className="text-xs text-on-surface-variant font-label mt-1">
              Total Spent
            </p>
          </div>
          <div className="bg-surface-container-low rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-on-surface">
              {formatNaira(customer.avgOrder)}
            </p>
            <p className="text-xs text-on-surface-variant font-label mt-1">
              Avg Order
            </p>
          </div>
        </div>

        {/* Payment Reliability */}
        <div className="bg-surface-container-low rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-label font-semibold text-on-surface text-sm">
              Payment Reliability
            </h3>
            <span className="text-sm font-bold text-on-surface">
              {customer.reliabilityPct}%
            </span>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: reliabilityDots }).map((_, i) => (
              <div
                key={i}
                className={`h-3 flex-1 rounded-full ${
                  i < filledDots
                    ? customer.reliabilityPct >= 70
                      ? "bg-success"
                      : "bg-orange-400"
                    : "bg-surface-container-highest"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-on-surface-variant">
            {customer.reliabilityPct >= 80
              ? "Great payer - consistently pays on time"
              : customer.reliabilityPct >= 50
                ? "Sometimes pays late - follow up recommended"
                : "Frequently late - consider stricter terms"}
          </p>
        </div>

        {/* Usually Buys */}
        {customer.usualProducts.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-label font-semibold text-on-surface text-sm">
              Usually Buys
            </h3>
            <div className="flex flex-wrap gap-2">
              {customer.usualProducts.map((p) => (
                <span
                  key={p.sizeMl}
                  className="bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1.5 rounded-full text-sm font-label font-medium"
                >
                  {formatBottleSize(p.sizeMl)}{" "}
                  <span className="opacity-60">x{p.qty}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Outstanding Balance Card */}
        {customer.outstanding > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600 font-label font-semibold uppercase tracking-wider">
                  Outstanding Balance
                </p>
                <p className="text-3xl font-bold text-orange-700 mt-1">
                  {formatNaira(customer.outstanding)}
                </p>
              </div>
              <span className="material-symbols-outlined text-orange-400 text-4xl">
                account_balance_wallet
              </span>
            </div>
            {customer.phone && (
              <a
                href={whatsappLink(
                  customer.phone,
                  `Hi ${customer.name.split(" ")[0]}, this is a friendly reminder about your outstanding balance of ${formatNaira(customer.outstanding)}. Please let us know when you can make the payment. Thank you!`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-orange-500 text-white py-3 rounded-xl font-label font-bold text-sm w-full active:scale-[0.98] transition-transform"
              >
                <span className="material-symbols-outlined text-lg">send</span>
                Send Reminder
              </a>
            )}
          </div>
        )}

        {/* Recent Orders */}
        <div className="space-y-3">
          <h3 className="text-xl font-headline font-bold italic text-on-surface">
            Recent Orders
          </h3>

          {customer.recentOrders.length === 0 && (
            <div className="bg-surface-container-low rounded-xl p-6 text-center">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/30 mb-1 block">
                receipt_long
              </span>
              <p className="text-on-surface-variant text-sm">No orders yet</p>
            </div>
          )}

          {customer.recentOrders.map((order) => (
            <div
              key={order.id}
              className="bg-surface-container-low rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusBadge(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    {formatDate(order.date)}
                  </span>
                </div>
                <p className="text-lg font-bold text-on-surface">
                  {formatNaira(order.totalAmount)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {order.items.map((item, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-surface-container-highest text-on-surface-variant px-2 py-0.5 rounded-full"
                  >
                    {formatBottleSize(item.bottleSizeMl)} x{item.quantity}
                  </span>
                ))}
              </div>
              {order.owed > 0 && (
                <p className="text-xs text-orange-600 font-medium">
                  Owes {formatNaira(order.owed)}
                </p>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-20 left-0 w-full px-6 pb-2 z-40">
        <Link
          href={`/sell?customerId=${customer.id}`}
          className="flex items-center justify-center gap-2 bg-primary text-on-primary py-4 rounded-2xl font-label font-bold text-base w-full active:scale-[0.98] transition-transform shadow-lg"
        >
          <span className="material-symbols-outlined text-xl">add_shopping_cart</span>
          New Sale to {customer.name.split(" ")[0]}
        </Link>
      </div>

      <BottomNav />
    </div>
  );
}
