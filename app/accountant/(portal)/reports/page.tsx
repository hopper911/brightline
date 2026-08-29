import { redirect } from "next/navigation";
import { getAccountantPortalContext } from "@/lib/accountant/auth";
import AccountantReportsClient from "./AccountantReportsClient";
import { ExportDownloadLink } from "../export-download-link";

export const dynamic = "force-dynamic";

export default async function AccountantReportsPage() {
  const ctx = await getAccountantPortalContext();
  if (!ctx) redirect("/accountant/login");
  if (!ctx.permissions.canExportReports) redirect("/accountant");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl text-white">Reports</h1>
        <p className="mt-1 text-sm text-white/55">CSV exports and archived ledger bundles.</p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-display text-xl text-white">Quick exports</h2>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <ExportDownloadLink
            className="rounded-lg border border-white/20 px-3 py-2 text-white/80 hover:bg-white/5"
            href="/api/accountant/export/invoices"
          >
            Invoices
          </ExportDownloadLink>
          <ExportDownloadLink
            className="rounded-lg border border-white/20 px-3 py-2 text-white/80 hover:bg-white/5"
            href="/api/accountant/export/payments"
          >
            Payments
          </ExportDownloadLink>
          <ExportDownloadLink
            className="rounded-lg border border-white/20 px-3 py-2 text-white/80 hover:bg-white/5"
            href="/api/accountant/export/expenses"
          >
            Expenses
          </ExportDownloadLink>
          <ExportDownloadLink
            className="rounded-lg border border-white/20 px-3 py-2 text-white/80 hover:bg-white/5"
            href="/api/accountant/export/transactions"
          >
            Full ledger
          </ExportDownloadLink>
        </div>
      </section>

      <AccountantReportsClient />
    </div>
  );
}
