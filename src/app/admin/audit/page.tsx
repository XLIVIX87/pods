export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";
import { timeAgo } from "@/lib/utils";

const PAGE_SIZE = 50;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entity?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const entityFilter = sp.entity;

  const where = entityFilter ? { entityType: entityFilter } : undefined;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const entityTypes = [
    "All",
    "Sale",
    "Purchase",
    "Payment",
    "Customer",
    "Supplier",
  ];

  return (
    <div className="min-h-dvh pb-32">
      <TopBar title="Audit log" showBack variant="page" />

      <main className="px-6 mt-4 space-y-5">
        <header className="space-y-1">
          <h1 className="font-headline italic text-3xl font-bold text-on-surface">
            Audit log
          </h1>
          <p className="text-sm text-on-surface-variant">
            Every edit, void, and delete tracked here. {total} total entries.
          </p>
        </header>

        {/* Entity filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {entityTypes.map((e) => {
            const active =
              (e === "All" && !entityFilter) || e === entityFilter;
            const href =
              e === "All" ? "/admin/audit" : `/admin/audit?entity=${e}`;
            return (
              <a
                key={e}
                href={href}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
                  active
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {e}
              </a>
            );
          })}
        </div>

        {logs.length === 0 ? (
          <div className="rounded-xl bg-surface-container-low p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2 block">
              history
            </span>
            <p className="text-on-surface-variant">No audit entries yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <details
                key={log.id}
                className="rounded-xl bg-surface-container-low p-4"
              >
                <summary className="cursor-pointer list-none flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${actionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                      <span className="text-xs font-bold text-on-surface">
                        {log.entityType}
                      </span>
                      <span className="text-[11px] text-on-surface-variant font-mono">
                        {log.entityId.slice(-6)}
                      </span>
                    </div>
                    <p className="text-sm text-on-surface mt-1">
                      {log.actorName}
                      {log.reason ? (
                        <span className="text-on-surface-variant">
                          {" "}
                          · {log.reason}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      {timeAgo(log.createdAt)}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-base">
                    expand_more
                  </span>
                </summary>
                <div className="mt-3 pt-3 border-t border-outline/10 grid gap-3 text-xs">
                  {log.before !== null && (
                    <div>
                      <p className="font-bold text-on-surface-variant uppercase tracking-widest text-[10px] mb-1">
                        Before
                      </p>
                      <pre className="bg-surface-container rounded-lg p-3 overflow-x-auto text-[11px] text-on-surface">
                        {JSON.stringify(log.before, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.after !== null && (
                    <div>
                      <p className="font-bold text-on-surface-variant uppercase tracking-widest text-[10px] mb-1">
                        After
                      </p>
                      <pre className="bg-surface-container rounded-lg p-3 overflow-x-auto text-[11px] text-on-surface">
                        {JSON.stringify(log.after, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <a
              href={page > 1
                ? `/admin/audit?page=${page - 1}${entityFilter ? `&entity=${entityFilter}` : ""}`
                : "#"}
              className={`px-4 py-2 rounded-lg text-sm font-bold ${
                page > 1
                  ? "bg-surface-container text-on-surface"
                  : "bg-surface-container-low text-on-surface-variant/40 pointer-events-none"
              }`}
            >
              Previous
            </a>
            <span className="text-sm text-on-surface-variant">
              Page {page} of {totalPages}
            </span>
            <a
              href={page < totalPages
                ? `/admin/audit?page=${page + 1}${entityFilter ? `&entity=${entityFilter}` : ""}`
                : "#"}
              className={`px-4 py-2 rounded-lg text-sm font-bold ${
                page < totalPages
                  ? "bg-surface-container text-on-surface"
                  : "bg-surface-container-low text-on-surface-variant/40 pointer-events-none"
              }`}
            >
              Next
            </a>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function actionBadge(action: string) {
  switch (action) {
    case "CREATE":
      return "bg-success-light text-success";
    case "UPDATE":
      return "bg-primary-fixed text-on-primary-fixed";
    case "VOID":
      return "bg-orange-100 text-orange-800";
    case "DELETE":
      return "bg-error-container text-on-error-container";
    default:
      return "bg-surface-container-high text-on-surface-variant";
  }
}
