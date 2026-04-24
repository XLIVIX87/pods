import Link from "next/link";
import { notFound } from "next/navigation";
import BottomNav from "@/components/layout/BottomNav";
import TopBar from "@/components/layout/TopBar";
import PurchaseActions from "./PurchaseActions";
import { prisma } from "@/lib/prisma";
import { formatNaira, formatDate, formatBottleSize } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusLabel = (status: string) => {
  switch (status) {
    case "PENDING_CHECK":
      return "Pending Quality Check";
    case "ACCEPTED":
      return "Accepted";
    case "ACCEPTED_WITH_NOTE":
      return "Accepted with Note";
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

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      qualityCheck: true,
      packingSessions: {
        include: { packedProducts: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!purchase) notFound();

  const totalLitres = purchase.kegs * purchase.kegSizeLitres;
  const qc = purchase.qualityCheck;
  const passedCount = qc
    ? [qc.colourPass, qc.smellPass, qc.tastePass, qc.waterPass].filter(
        (v) => v === true
      ).length
    : 0;

  return (
    <div className="min-h-dvh pb-32">
      <TopBar variant="page" title="Purchase" showBack />

      <main className="px-6 space-y-6 mt-2 max-w-2xl mx-auto">
        {/* Header */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${statusClass(purchase.status)}`}
            >
              {statusLabel(purchase.status)}
            </span>
            <span className="text-xs text-on-surface-variant font-medium">
              {formatDate(purchase.date)}
            </span>
          </div>
          <h1 className="text-3xl font-headline font-bold text-on-surface leading-tight">
            {purchase.kegs} kegs from {purchase.supplier.name}
          </h1>
          {purchase.supplier.location && (
            <p className="text-on-surface-variant">
              {purchase.supplier.location}
            </p>
          )}
        </section>

        {/* Cost summary */}
        <section className="bg-surface-container-low rounded-xl p-5 space-y-3">
          <p className="font-label text-xs font-bold text-outline uppercase tracking-wider">
            Cost summary
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                Total cost
              </p>
              <p className="text-xl font-bold text-on-surface">
                {formatNaira(purchase.totalCost)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                Cost / litre
              </p>
              <p className="text-xl font-bold text-on-surface">
                {formatNaira(Math.round(purchase.costPerLitre))}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                Price / keg
              </p>
              <p className="font-body text-on-surface">
                {formatNaira(purchase.pricePerKeg)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                Transport
              </p>
              <p className="font-body text-on-surface">
                {formatNaira(purchase.transportCost)}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                Kegs
              </p>
              <p className="font-body text-on-surface">
                {purchase.kegs} × {purchase.kegSizeLitres}L
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">
                Total litres
              </p>
              <p className="font-body text-on-surface">{totalLitres}L</p>
            </div>
          </div>
        </section>

        {/* Quality check */}
        <section className="bg-surface-container-low rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-label text-xs font-bold text-outline uppercase tracking-wider">
              Quality check
            </p>
            {!qc && purchase.status === "PENDING_CHECK" && (
              <Link
                href={`/check/${purchase.id}`}
                className="text-xs font-bold text-primary"
              >
                Run check →
              </Link>
            )}
          </div>
          {qc ? (
            <div className="space-y-2">
              <div className="flex gap-3 text-sm">
                {[
                  { label: "Colour", value: qc.colourPass },
                  { label: "Smell", value: qc.smellPass },
                  { label: "Taste", value: qc.tastePass },
                  { label: "Water", value: qc.waterPass },
                ].map((t) => (
                  <div
                    key={t.label}
                    className="flex-1 bg-surface-container-lowest rounded-lg p-2 text-center"
                  >
                    <p className="text-[10px] uppercase font-bold text-on-surface-variant">
                      {t.label}
                    </p>
                    <span
                      className={`material-symbols-outlined text-lg ${
                        t.value === true
                          ? "text-success"
                          : t.value === false
                            ? "text-error"
                            : "text-on-surface-variant/30"
                      }`}
                    >
                      {t.value === true
                        ? "check_circle"
                        : t.value === false
                          ? "cancel"
                          : "help"}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-on-surface-variant">
                {passedCount} of 4 tests passed · {formatDate(qc.checkedAt)}
              </p>
              {qc.note && (
                <div className="bg-surface-container-lowest rounded-lg p-3 mt-2">
                  <p className="text-xs font-label uppercase tracking-wider text-on-surface-variant font-bold mb-1">
                    Note
                  </p>
                  <p className="text-sm text-on-surface">{qc.note}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant italic">
              No quality check recorded yet.
            </p>
          )}
        </section>

        <PurchaseActions
          purchaseId={purchase.id}
          status={purchase.status}
          hasPackingSessions={purchase.packingSessions.length > 0}
          current={{
            kegs: purchase.kegs,
            kegSizeLitres: purchase.kegSizeLitres,
            pricePerKeg: purchase.pricePerKeg,
            transportCost: purchase.transportCost,
          }}
        />

        {/* Packing sessions */}
        {purchase.packingSessions.length > 0 && (
          <section className="bg-surface-container-low rounded-xl p-5 space-y-3">
            <p className="font-label text-xs font-bold text-outline uppercase tracking-wider">
              Packing sessions
            </p>
            <div className="space-y-3">
              {purchase.packingSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-surface-container-lowest rounded-lg p-3"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-body font-semibold text-sm text-on-surface">
                        {session.kegsOpened} keg
                        {session.kegsOpened > 1 ? "s" : ""} opened
                      </p>
                      <p className="text-xs text-on-surface-variant">
                        {formatDate(session.createdAt)} ·{" "}
                        {session.litresPacked.toFixed(1)}L of{" "}
                        {session.litresAvailable}L
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {session.packedProducts.map((prod) => (
                      <span
                        key={prod.id}
                        className="bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold px-2 py-0.5 rounded-full"
                      >
                        {prod.quantity}× {formatBottleSize(prod.bottleSizeMl)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
