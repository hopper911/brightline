import { redirect } from "next/navigation";
import { getAccountantPortalContext } from "@/lib/accountant/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function money(n: { toString(): string }) {
  return Number(n.toString()).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default async function AccountantPaymentsPage() {
  const ctx = await getAccountantPortalContext();
  if (!ctx) redirect("/accountant/login");
  if (!ctx.permissions.canViewPayments) redirect("/accountant");

  const payments = await prisma.studioPayment.findMany({
    orderBy: { date: "desc" },
    take: 100,
    select: {
      id: true,
      amount: true,
      date: true,
      type: true,
      recordStatus: true,
      paymentMethod: true,
      note: true,
      invoice: { select: { invoiceNumber: true } },
      project: { select: { title: true, client: true } },
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-white">Payments</h1>
          <p className="mt-1 text-sm text-white/55">Recorded studio payments (Mission Control ledger).</p>
        </div>
        <a
          className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
          href="/api/accountant/export/payments"
        >
          Export CSV
        </a>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="text-white/80">
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-white/60">{p.date.toLocaleDateString()}</td>
                <td className="px-4 py-3">{p.project.title}</td>
                <td className="px-4 py-3 text-white/60">{p.project.client}</td>
                <td className="px-4 py-3">{p.type}</td>
                <td className="px-4 py-3 font-mono text-xs text-white/60">
                  {p.invoice ? `#${p.invoice.invoiceNumber}` : "—"}
                </td>
                <td className="px-4 py-3 text-xs">{p.recordStatus}</td>
                <td className="px-4 py-3 text-right tabular-nums text-white">{money(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
