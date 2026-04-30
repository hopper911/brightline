import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { InvoiceQuickPanel } from "./InvoiceQuickPanel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Invoices · Studio OS · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

function money(value: { toString(): string }) {
  return Number(value.toString()).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export default async function StudioInvoicesPage() {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login?next=%2Fstudio%2Finvoices");

  const [invoices, templates, projects] = await Promise.all([
    prisma.studioInvoice.findMany({
      orderBy: { invoiceNumber: "desc" },
      take: 150,
      include: {
        client: { select: { companyName: true } },
        project: { select: { title: true } },
        _count: { select: { lineItems: true } },
      },
    }),
    prisma.studioServiceTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      take: 50,
    }),
    prisma.studioProject.findMany({
      orderBy: { updatedAt: "desc" },
      where: { clientId: { not: null } },
      select: { id: true, title: true, client: true, clientId: true },
      take: 200,
    }),
  ]);

  const templateRows = templates.map((t) => ({
    ...t,
    defaultPrice: t.defaultPrice.toString(),
    maxPrice: t.maxPrice?.toString() ?? null,
  }));

  return (
    <main className="mx-auto max-w-7xl px-4 py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/studio"
            className="text-xs uppercase tracking-[0.25em] text-white/45 hover:text-white/80"
          >
            Studio OS
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <h1 className="font-display text-4xl text-white">Invoices</h1>
            <Link
              href="/studio/finance"
              className="text-xs uppercase tracking-[0.2em] text-white/45 hover:text-white/75"
            >
              Finance
            </Link>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-white/65">
            Service templates, auto-generated billing, and line-level media attribution.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <InvoiceQuickPanel templates={templateRows} projects={projects} />
      </div>

      <div className="mt-10 overflow-hidden rounded-2xl border border-white/10">
        <div className="border-b border-white/10 bg-white/5 px-4 py-3">
          <h2 className="font-display text-xl text-white">Recent invoices</h2>
        </div>
        <div className="divide-y divide-white/10">
          {invoices.length === 0 ? (
            <p className="px-4 py-10 text-sm text-white/50">
              No invoices yet. Generate from a project or create a draft.
            </p>
          ) : (
            invoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/studio/invoices/${inv.id}`}
                className="grid grid-cols-12 gap-3 px-4 py-3 text-sm transition hover:bg-white/[0.04]"
              >
                <div className="col-span-3 font-medium text-white">
                  #{String(inv.invoiceNumber).padStart(3, "0")}
                </div>
                <div className="col-span-4 text-white/85">{inv.client.companyName}</div>
                <div className="col-span-3 text-white/50">{inv.project?.title ?? "—"}</div>
                <div className="col-span-2 text-right text-white/80">{money(inv.total)}</div>
                <div className="col-span-12 text-xs text-white/40">
                  {inv.status} · {inv._count.lineItems} lines · balance {money(inv.balanceRemaining)}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
