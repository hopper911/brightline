import { redirect } from "next/navigation";
import { getAccountantPortalContext } from "@/lib/accountant/auth";
import type { AccountantPermission } from "@prisma/client";

export const dynamic = "force-dynamic";

function permLine(label: string, on: boolean) {
  return (
    <li className="flex justify-between border-b border-white/5 py-2 text-sm">
      <span className="text-white/70">{label}</span>
      <span className={on ? "text-emerald-300/90" : "text-white/35"}>{on ? "Yes" : "No"}</span>
    </li>
  );
}

const LABELS: Record<keyof Omit<AccountantPermission, "id" | "accountantAccessId">, string> = {
  canViewInvoices: "View invoices",
  canViewPayments: "View payments",
  canViewExpenses: "View expenses",
  canViewTransactions: "View merged transactions",
  canUploadReceipts: "Upload receipts",
  canExportReports: "Export CSV / reports",
  canDownloadDocuments: "Download stored documents",
  canAddAccountingNotes: "Add accounting notes",
  canViewProjectFinancials: "View project financial rollups",
  canEditExpenseCategories: "Edit expense categories",
  canCreateExpenses: "Create expenses",
  canEditExpenses: "Edit expenses",
};

export default async function AccountantSettingsPage() {
  const ctx = await getAccountantPortalContext();
  if (!ctx) redirect("/accountant/login");

  const map = ctx.permissions;
  const syntheticOwner = ctx.kind === "owner";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl text-white">Settings</h1>
        <p className="mt-1 text-sm text-white/55">Session details and effective permissions.</p>
      </header>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-display text-xl text-white">Session</h2>
        <dl className="mt-4 space-y-2 text-sm text-white/75">
          <div className="flex justify-between gap-4">
            <dt className="text-white/45">Access type</dt>
            <dd>{ctx.kind === "owner" ? "Owner / admin (Mission Control cookie)" : "Accountant login"}</dd>
          </div>
          {ctx.kind === "accountant" ? (
            <div className="flex justify-between gap-4">
              <dt className="text-white/45">Email</dt>
              <dd>{ctx.accountantAccess.email}</dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-4 text-xs text-white/45">
          Password changes are issued by an operator via{" "}
          <code className="text-white/55">POST /api/admin/accountant-access</code>.
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-display text-xl text-white">Permissions</h2>
        {syntheticOwner ? (
          <p className="mt-2 text-sm text-amber-100/80">Owner sessions inherit full finance portal access.</p>
        ) : null}
        <ul className="mt-4">
          {(Object.keys(LABELS) as Array<keyof typeof LABELS>).map((k) =>
            permLine(LABELS[k], Boolean(map[k as keyof typeof map]))
          )}
        </ul>
      </section>
    </div>
  );
}
