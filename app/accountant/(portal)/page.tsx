import Link from "next/link";
import { redirect } from "next/navigation";
import { StudioInvoiceStatus } from "@prisma/client";
import { getAccountantPortalContext } from "@/lib/accountant/auth";
import { prisma } from "@/lib/prisma";
import { getFinanceOverview } from "@/lib/studio/finance";

export const dynamic = "force-dynamic";

function money(n: { toString(): string }) {
  return Number(n.toString()).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default async function AccountantDashboardPage() {
  const ctx = await getAccountantPortalContext();
  if (!ctx) redirect("/accountant/login");

  const [overview, invoiceGroups, openAgg, overdueCount, recentReceipts] = await Promise.all([
    getFinanceOverview(),
    prisma.studioInvoice.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.studioInvoice.aggregate({
      where: {
        balanceRemaining: { gt: 0 },
        status: { notIn: [StudioInvoiceStatus.VOID, StudioInvoiceStatus.CANCELED] },
      },
      _count: true,
      _sum: { balanceRemaining: true },
    }),
    prisma.studioInvoice.count({
      where: { status: StudioInvoiceStatus.OVERDUE },
    }),
    prisma.accountingReceipt.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, fileName: true, r2Key: true, createdAt: true },
    }),
  ]);

  const statusCounts = Object.fromEntries(invoiceGroups.map((g) => [g.status, g._count._all])) as Partial<
    Record<StudioInvoiceStatus, number>
  >;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-3xl text-white">Finance overview</h1>
        <p className="mt-1 text-sm text-white/55">
          Month {overview.month.label}: revenue {money(overview.summary.revenueThisMonth)}, expenses{" "}
          {money(overview.summary.expensesThisMonth)}.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-wider text-white/45">Open invoice balance</p>
          <p className="mt-2 font-display text-2xl text-white">
            {openAgg._sum.balanceRemaining ? money(openAgg._sum.balanceRemaining) : "—"}
          </p>
          <p className="mt-1 text-xs text-white/45">{openAgg._count} invoices with balance</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-wider text-white/45">Overdue</p>
          <p className="mt-2 font-display text-2xl text-white">{overdueCount}</p>
          <p className="mt-1 text-xs text-white/45">StudioInvoiceStatus.OVERDUE</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-wider text-white/45">Outstanding (projects)</p>
          <p className="mt-2 font-display text-2xl text-white">{money(overview.summary.outstandingBalance)}</p>
        </div>
      </section>

      {ctx.permissions.canViewInvoices ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-display text-xl text-white">Invoices by status</h2>
          <ul className="mt-4 grid gap-2 text-sm text-white/70 sm:grid-cols-2">
            {Object.values(StudioInvoiceStatus).map((s) => (
              <li key={s} className="flex justify-between border-b border-white/5 py-2">
                <span>{s}</span>
                <span className="text-white">{statusCounts[s] ?? 0}</span>
              </li>
            ))}
          </ul>
          <Link className="mt-4 inline-block text-sm text-amber-200/90 hover:text-amber-100" href="/accountant/invoices">
            View invoices →
          </Link>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        {ctx.permissions.canViewPayments ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="font-display text-xl text-white">Recent payments</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {overview.payments.slice(0, 6).map((p) => (
                <li key={p.id} className="flex justify-between gap-4 text-white/75">
                  <span className="min-w-0 truncate">{p.project.title}</span>
                  <span className="flex-shrink-0 text-white">{money(p.amount)}</span>
                </li>
              ))}
            </ul>
            <Link className="mt-4 inline-block text-sm text-amber-200/90" href="/accountant/payments">
              All payments →
            </Link>
          </div>
        ) : null}
        {ctx.permissions.canViewExpenses ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="font-display text-xl text-white">Recent expenses</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {overview.expenses.slice(0, 6).map((e) => (
                <li key={e.id} className="flex justify-between gap-4 text-white/75">
                  <span className="min-w-0 truncate">{e.category}</span>
                  <span className="flex-shrink-0 text-white">{money(e.amount)}</span>
                </li>
              ))}
            </ul>
            <Link className="mt-4 inline-block text-sm text-amber-200/90" href="/accountant/expenses">
              All expenses →
            </Link>
          </div>
        ) : null}
      </section>

      {ctx.permissions.canUploadReceipts ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-display text-xl text-white">Recent receipts</h2>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            {recentReceipts.map((r) => (
              <li key={r.id} className="flex justify-between gap-4">
                <span className="min-w-0 truncate">{r.fileName}</span>
                <a
                  className="flex-shrink-0 text-amber-200/90 hover:text-amber-100"
                  href={`/api/accountant/download?key=${encodeURIComponent(r.r2Key)}`}
                >
                  Download
                </a>
              </li>
            ))}
            {recentReceipts.length === 0 ? <li className="text-white/45">No portal receipts yet.</li> : null}
          </ul>
          <Link className="mt-4 inline-block text-sm text-amber-200/90" href="/accountant/receipts">
            Receipt inbox →
          </Link>
        </section>
      ) : null}

      {ctx.permissions.canExportReports ? (
        <section className="rounded-2xl border border-amber-200/15 bg-amber-200/5 p-6">
          <h2 className="font-display text-xl text-white">Exports</h2>
          <p className="mt-1 text-sm text-white/55">Download CSV extracts (uses your current session).</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a className="rounded-lg border border-white/20 px-3 py-2 text-white/80 hover:bg-white/5" href="/api/accountant/export/invoices">
              Invoices CSV
            </a>
            <a className="rounded-lg border border-white/20 px-3 py-2 text-white/80 hover:bg-white/5" href="/api/accountant/export/payments">
              Payments CSV
            </a>
            <a className="rounded-lg border border-white/20 px-3 py-2 text-white/80 hover:bg-white/5" href="/api/accountant/export/expenses">
              Expenses CSV
            </a>
            <a
              className="rounded-lg border border-white/20 px-3 py-2 text-white/80 hover:bg-white/5"
              href="/api/accountant/export/transactions"
            >
              Ledger CSV
            </a>
          </div>
          <Link className="mt-4 inline-block text-sm text-amber-200/90" href="/accountant/reports">
            Report builder →
          </Link>
        </section>
      ) : null}
    </div>
  );
}
