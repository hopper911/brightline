import Link from "next/link";
import type { PermissionKey } from "@/lib/accountant/auth";
import { getAccountantPortalContext } from "@/lib/accountant/auth";

const NAV: Array<{ href: string; label: string; perm?: PermissionKey }> = [
  { href: "/accountant", label: "Dashboard" },
  { href: "/accountant/invoices", label: "Invoices", perm: "canViewInvoices" },
  { href: "/accountant/payments", label: "Payments", perm: "canViewPayments" },
  { href: "/accountant/transactions", label: "Transactions", perm: "canViewTransactions" },
  { href: "/accountant/expenses", label: "Expenses", perm: "canViewExpenses" },
  { href: "/accountant/receipts", label: "Receipts", perm: "canUploadReceipts" },
  { href: "/accountant/reports", label: "Reports", perm: "canExportReports" },
  { href: "/accountant/documents", label: "Documents", perm: "canDownloadDocuments" },
  { href: "/accountant/settings", label: "Settings" },
];

export async function AccountantNav() {
  const ctx = await getAccountantPortalContext();
  if (!ctx) return null;

  return (
    <nav className="flex flex-col gap-1 border-b border-white/10 pb-6 md:border-b-0 md:border-r md:pb-0 md:pr-6">
      <p className="mb-3 font-display text-lg text-white">Accountant</p>
      {NAV.map((n) => {
        if (n.perm && !ctx.permissions[n.perm]) return null;
        return (
          <Link
            key={n.href}
            href={n.href}
            className="rounded-lg px-3 py-2 text-sm text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
