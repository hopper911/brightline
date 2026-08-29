import { redirect } from "next/navigation";
import { getAccountantPortalContext } from "@/lib/accountant/auth";
import { ExpenseCreateForm } from "@/components/accountant/ExpenseCreateForm";
import { prisma } from "@/lib/prisma";
import { ExportDownloadLink } from "../export-download-link";

export const dynamic = "force-dynamic";

function money(n: { toString(): string }) {
  return Number(n.toString()).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default async function AccountantExpensesPage() {
  const ctx = await getAccountantPortalContext();
  if (!ctx) redirect("/accountant/login");
  if (!ctx.permissions.canViewExpenses) redirect("/accountant");

  const expenses = await prisma.studioExpense.findMany({
    orderBy: { date: "desc" },
    take: 100,
    select: {
      id: true,
      amount: true,
      category: true,
      date: true,
      title: true,
      vendor: true,
      paymentMethod: true,
      project: { select: { title: true, client: true } },
      studioClient: { select: { companyName: true } },
      _count: { select: { accountingReceipts: true } },
    },
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-white">Expenses</h1>
          <p className="mt-1 text-sm text-white/55">Operational expenses and vendor spend.</p>
        </div>
        <ExportDownloadLink
          className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
          href="/api/accountant/export/expenses"
        >
          Export CSV
        </ExportDownloadLink>
      </header>

      {ctx.permissions.canCreateExpenses ? <ExpenseCreateForm /> : null}

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Vendor</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Receipts</th>
            </tr>
          </thead>
          <tbody className="text-white/80">
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-white/60">{e.date.toLocaleDateString()}</td>
                <td className="px-4 py-3">{e.category}</td>
                <td className="px-4 py-3 text-white/60">{e.vendor ?? "—"}</td>
                <td className="px-4 py-3 text-white/60">{e.studioClient?.companyName ?? "—"}</td>
                <td className="px-4 py-3 text-white/60">{e.project?.title ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums text-white">{money(e.amount)}</td>
                <td className="px-4 py-3 text-xs text-white/50">{e._count.accountingReceipts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
