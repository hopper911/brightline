import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccountantPortalContext } from "@/lib/accountant/auth";
import { invoiceStatusLabel } from "@/lib/accountant/invoice-status";
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

export default async function AccountantInvoicesPage() {
  const ctx = await getAccountantPortalContext();
  if (!ctx) redirect("/accountant/login");
  if (!ctx.permissions.canViewInvoices) redirect("/accountant");

  const invoices = await prisma.studioInvoice.findMany({
    orderBy: { issuedAt: "desc" },
    take: 80,
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      issuedAt: true,
      dueAt: true,
      total: true,
      balanceRemaining: true,
      client: { select: { companyName: true } },
      pdfStorageKey: true,
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-white">Invoices</h1>
          <p className="mt-1 text-sm text-white/55">Outstanding and historical studio invoices.</p>
        </div>
        <ExportDownloadLink
          className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
          href="/api/accountant/export/invoices"
        >
          Export CSV
        </ExportDownloadLink>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-white/45">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Open</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="text-white/80">
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-white/5">
                <td className="px-4 py-3 font-mono text-white">{inv.invoiceNumber}</td>
                <td className="px-4 py-3">{inv.client.companyName}</td>
                <td className="px-4 py-3">{invoiceStatusLabel(inv.status)}</td>
                <td className="px-4 py-3 text-white/60">{inv.issuedAt ? inv.issuedAt.toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3 text-white/60">{inv.dueAt ? inv.dueAt.toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(inv.total)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(inv.balanceRemaining)}</td>
                <td className="px-4 py-3 text-right">
                  <Link className="text-amber-200/90 hover:text-amber-100" href={`/accountant/invoices/${inv.id}`}>
                    View
                  </Link>
                  {inv.pdfStorageKey ? (
                    <>
                      {" · "}
                      <a className="text-amber-200/90 hover:text-amber-100" href={`/api/accountant/invoices/${inv.id}/pdf`}>
                        PDF
                      </a>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
