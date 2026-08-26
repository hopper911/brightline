import { redirect } from "next/navigation";
import { getAccountantPortalContext } from "@/lib/accountant/auth";
import { loadUnifiedLedger } from "@/lib/accountant/ledger-query";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function money(s: string) {
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export default async function AccountantTransactionsPage() {
  const ctx = await getAccountantPortalContext();
  if (!ctx) redirect("/accountant/login");
  if (!ctx.permissions.canViewTransactions) redirect("/accountant");

  const rows = await loadUnifiedLedger(prisma, {});

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-white">Transactions</h1>
          <p className="mt-1 text-sm text-white/55">
            Merged ledger: payments, expenses, and manual adjustments.
          </p>
        </div>
        <a
          className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
          href="/api/accountant/export/transactions"
        >
          Export CSV
        </a>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="text-white/80">
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-white/60">{r.transactionDate.toLocaleDateString()}</td>
                <td className="px-4 py-3">{r.source}</td>
                <td className="px-4 py-3 text-xs">{r.ledgerType}</td>
                <td className="px-4 py-3">{r.category}</td>
                <td className="max-w-xs truncate px-4 py-3 text-white/70">{r.description}</td>
                <td className="px-4 py-3 text-white/60">{r.clientName ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums text-white">{money(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
