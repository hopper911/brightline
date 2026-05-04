import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { getDashboardMetrics } from "@/lib/dashboard-metrics";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Business · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatMoneyDetailed(n: number | null) {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

function SimpleMonthBars({
  points,
  valueKey,
}: {
  points: Array<{ month: string; label: string; amount?: number; count?: number }>;
  valueKey: "amount" | "count";
}) {
  const values = points.map((p) => Number(p[valueKey] ?? 0));
  const max = Math.max(...values, 1);
  return (
    <div className="mt-4 flex h-40 items-end gap-1 sm:gap-1.5">
      {points.map((p) => {
        const v = Number(p[valueKey] ?? 0);
        const pct = v <= 0 ? 0 : Math.max(8, Math.round((v / max) * 100));
        return (
          <div
            key={p.month}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
            title={`${p.label}: ${valueKey === "amount" ? formatMoney(v) : v}`}
          >
            <div
              className={`w-full max-w-[28px] rounded-t bg-gradient-to-t from-emerald-600/80 to-emerald-400/90 ${v <= 0 ? "opacity-25" : ""}`}
              style={{ height: v <= 0 ? "3px" : `${pct}%` }}
            />
            <span className="hidden truncate text-[0.55rem] text-white/40 sm:block">
              {p.label.split(" ")[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default async function BusinessDashboardPage() {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  let metrics: Awaited<ReturnType<typeof getDashboardMetrics>> | null = null;
  try {
    metrics = await getDashboardMetrics();
  } catch {
    metrics = null;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Studio OS</p>
        <h1 className="font-display text-3xl text-white">Business intelligence</h1>
        <p className="text-sm text-white/65">
          Revenue, clients, project throughput, and delivery health from live database records.
        </p>
      </div>

      {!metrics ? (
        <p className="mt-10 text-white/60">
          Could not load metrics. Check the database connection and try again.
        </p>
      ) : (
        <>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">
                Total revenue
              </p>
              <p className="mt-2 text-2xl text-white">{formatMoney(metrics.revenue.total)}</p>
              <p className="mt-1 text-xs text-white/45">Paid & partially paid invoices</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">
                Avg project value
              </p>
              <p className="mt-2 text-2xl text-white">
                {formatMoneyDetailed(metrics.revenue.averageProjectValue)}
              </p>
              <p className="mt-1 text-xs text-white/45">Per project with paid invoice allocation</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">Clients</p>
              <p className="mt-2 text-2xl text-white">{metrics.clients.total}</p>
              <p className="mt-1 text-xs text-white/45">
                {metrics.clients.repeat} repeat ({metrics.clients.total ? Math.round((metrics.clients.repeat / metrics.clients.total) * 100) : 0}
                %)
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-[0.65rem] uppercase tracking-[0.28em] text-white/45">Delivery</p>
              <p className="mt-2 text-2xl text-white">{metrics.delivery.delivered}</p>
              <p className="mt-1 text-xs text-white/45">{metrics.delivery.pending} pending</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl text-white">Monthly revenue</h2>
                  <p className="text-xs text-white/50">Last 12 months, by payment / update date</p>
                </div>
                <p className="text-xs text-white/40">
                  Avg invoice: {formatMoneyDetailed(metrics.revenue.averageInvoiceValue)}
                </p>
              </div>
              <SimpleMonthBars points={metrics.revenue.monthly} valueKey="amount" />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="font-display text-xl text-white">Projects per month</h2>
              <p className="text-xs text-white/50">New studio projects (not cancelled)</p>
              <SimpleMonthBars points={metrics.projects.perMonth} valueKey="count" />
              <p className="mt-4 text-sm text-white/55">
                Avg turnaround:{" "}
                {metrics.projects.averageTurnaroundDays != null
                  ? `${metrics.projects.averageTurnaroundDays} days`
                  : "—"}{" "}
                <span className="text-white/35">(created → delivery date)</span>
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="font-display text-xl text-white">Top clients by revenue</h2>
              <p className="text-xs text-white/50">Paid amounts attributed to each client</p>
              <ul className="mt-4 divide-y divide-white/10">
                {metrics.clients.topByRevenue.length === 0 ? (
                  <li className="py-3 text-sm text-white/45">No paid invoices yet.</li>
                ) : (
                  metrics.clients.topByRevenue.map((c, i) => (
                    <li
                      key={c.clientId}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                    >
                      <span className="text-white/45 tabular-nums">{i + 1}.</span>
                      <Link
                        href={`/admin/clients/${c.clientId}`}
                        className="min-w-0 flex-1 truncate text-white hover:text-emerald-300"
                      >
                        {c.name}
                      </Link>
                      <span className="tabular-nums text-white/80">{formatMoney(c.revenue)}</span>
                      <span className="text-xs text-white/35">{c.invoiceCount} inv.</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <h2 className="font-display text-xl text-white">Recent projects</h2>
              <p className="text-xs text-white/50">Latest updates in Studio CMS</p>
              <ul className="mt-4 divide-y divide-white/10">
                {metrics.projects.recent.map((p) => (
                  <li key={p.id} className="flex flex-col gap-0.5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <Link
                      href={`/admin/projects/${p.id}`}
                      className="font-medium text-white hover:text-emerald-300"
                    >
                      {p.title}
                    </Link>
                    <span className="text-xs text-white/45">
                      {p.client ?? "—"} · {p.status.replace(/_/g, " ")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-10 text-center text-[0.65rem] text-white/30">
            API:{" "}
            <code className="rounded bg-white/5 px-1.5 py-0.5 text-white/50">
              GET /api/admin/dashboard/metrics
            </code>
          </p>
        </>
      )}
    </div>
  );
}
