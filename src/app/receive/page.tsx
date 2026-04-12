import { prisma } from "@/lib/prisma";
import { formatNaira, timeAgo } from "@/lib/utils";
import TopBar from "@/components/layout/TopBar";
import ReceiveActions from "./ReceiveActions";

export const dynamic = "force-dynamic";

export default async function ReceivePage() {
  const inTransit = await prisma.purchase.findMany({
    where: { status: "IN_TRANSIT" },
    orderBy: { date: "desc" },
    include: { supplier: true },
  });

  const pendingCheck = await prisma.purchase.findMany({
    where: { status: "PENDING_CHECK" },
    orderBy: { receivedAt: "desc" },
    include: { supplier: true },
  });

  return (
    <div className="min-h-dvh flex flex-col pb-24">
      <TopBar title="Receive Goods" showBack variant="page" />

      <main className="flex-grow px-4 pt-4 max-w-2xl mx-auto w-full space-y-6">
        {/* In Transit Section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary">local_shipping</span>
            <h2 className="font-headline text-xl font-semibold text-on-surface">
              In Transit ({inTransit.length})
            </h2>
          </div>

          {inTransit.length === 0 ? (
            <div className="bg-surface-container-low rounded-xl p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-outline/40 mb-2">
                inventory_2
              </span>
              <p className="text-on-surface-variant">No orders in transit</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inTransit.map((purchase) => {
                const daysInTransit = Math.floor(
                  (Date.now() - new Date(purchase.date).getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={purchase.id}
                    className="bg-surface-container-lowest rounded-xl p-4 ring-1 ring-outline/10 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-on-surface">
                          {purchase.supplier.name}
                        </p>
                        <p className="text-sm text-on-surface-variant">
                          {purchase.kegs} kegs &middot; {formatNaira(purchase.totalCost)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-tertiary-fixed text-on-tertiary-fixed">
                          In Transit
                        </span>
                        <p className="text-xs text-on-surface-variant mt-1">
                          {daysInTransit === 0
                            ? "Ordered today"
                            : `${daysInTransit}d ago`}
                        </p>
                      </div>
                    </div>
                    <ReceiveActions purchaseId={purchase.id} />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Pending Check Section */}
        {pendingCheck.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-secondary">fact_check</span>
              <h2 className="font-headline text-xl font-semibold text-on-surface">
                Awaiting Quality Check ({pendingCheck.length})
              </h2>
            </div>
            <div className="space-y-3">
              {pendingCheck.map((purchase) => (
                <a
                  key={purchase.id}
                  href={`/check/${purchase.id}`}
                  className="block bg-surface-container-lowest rounded-xl p-4 ring-1 ring-outline/10 active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-on-surface">
                        {purchase.supplier.name}
                      </p>
                      <p className="text-sm text-on-surface-variant">
                        {purchase.kegs} kegs &middot; {formatNaira(purchase.totalCost)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary-fixed text-on-secondary-fixed">
                        Pending Check
                      </span>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Received {purchase.receivedAt ? timeAgo(purchase.receivedAt) : "recently"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-primary text-sm font-semibold">
                    <span className="material-symbols-outlined text-sm">science</span>
                    Run Quality Check
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
