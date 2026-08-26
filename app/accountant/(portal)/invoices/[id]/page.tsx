import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getAccountantPortalContext } from "@/lib/accountant/auth";
import { invoiceStatusLabel } from "@/lib/accountant/invoice-status";
import { AccountingNoteComposer } from "@/components/accountant/AccountingNoteComposer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function money(n: { toString(): string }) {
  return Number(n.toString()).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export default async function AccountantInvoiceDetailPage(props: { params: Promise<{ id: string }> }) {
  const ctx = await getAccountantPortalContext();
  if (!ctx) redirect("/accountant/login");
  if (!ctx.permissions.canViewInvoices) redirect("/accountant");

  const { id } = await props.params;
  const inv = await prisma.studioInvoice.findUnique({
    where: { id },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      issuedAt: true,
      dueAt: true,
      currency: true,
      subtotal: true,
      tax: true,
      discount: true,
      total: true,
      amountPaid: true,
      balanceRemaining: true,
      paymentInstructions: true,
      pdfStorageKey: true,
      client: { select: { id: true, companyName: true } },
      project: {
        select: ctx.permissions.canViewProjectFinancials
          ? {
              id: true,
              title: true,
              client: true,
              totalPrice: true,
              balanceRemaining: true,
            }
          : { id: true, title: true, client: true },
      },
      lineItems: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          type: true,
          unitLabel: true,
          unitPrice: true,
          quantity: true,
          amount: true,
        },
      },
      payments: {
        orderBy: { date: "desc" },
        select: {
          id: true,
          amount: true,
          date: true,
          type: true,
          note: true,
          recordStatus: true,
          paymentMethod: true,
        },
      },
      accountingNotes: {
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
          id: true,
          body: true,
          createdAt: true,
          authorType: true,
          isOwnerActor: true,
        },
      },
    },
  });

  if (!inv) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/accountant/invoices" className="text-sm text-amber-200/90 hover:text-amber-100">
          ← Invoices
        </Link>
        <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-white">
              Invoice #{inv.invoiceNumber}{" "}
              <span className="text-lg text-white/50">· {invoiceStatusLabel(inv.status)}</span>
            </h1>
            <p className="mt-1 text-sm text-white/55">
              {inv.client.companyName}
              {inv.project ? ` · ${inv.project.title}` : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {inv.pdfStorageKey ? (
              <a
                className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                href={`/api/accountant/invoices/${inv.id}/pdf`}
              >
                Download PDF
              </a>
            ) : null}
          </div>
        </header>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-white/45">Total</p>
          <p className="mt-1 font-display text-2xl text-white">{money(inv.total)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-white/45">Paid</p>
          <p className="mt-1 font-display text-2xl text-white">{money(inv.amountPaid)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-white/45">Balance</p>
          <p className="mt-1 font-display text-2xl text-white">{money(inv.balanceRemaining)}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-display text-xl text-white">Line items</h2>
        <ul className="mt-4 space-y-2 text-sm text-white/75">
          {inv.lineItems.map((li) => (
            <li key={li.id} className="flex justify-between gap-4 border-b border-white/5 py-2">
              <span className="min-w-0 flex-1">
                {li.name}{" "}
                <span className="text-white/45">
                  ({li.quantity.toString()} × {money(li.unitPrice)} {li.unitLabel})
                </span>
              </span>
              <span className="tabular-nums text-white">{money(li.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 text-sm text-white/60">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{money(inv.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>{money(inv.tax)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <span>{money(inv.discount)}</span>
          </div>
          <p className="text-xs text-white/40">Currency: {inv.currency}</p>
        </div>
      </section>

      {inv.payments.length ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-display text-xl text-white">Payments on record</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {inv.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap justify-between gap-2 text-white/75">
                <span>
                  {p.date.toLocaleDateString()} · {p.type} · {p.recordStatus}
                  {p.paymentMethod ? ` · ${p.paymentMethod}` : ""}
                </span>
                <span className="tabular-nums text-white">{money(p.amount)}</span>
                {p.note ? <p className="w-full text-xs text-white/45">{p.note}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {inv.paymentInstructions ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-display text-xl text-white">Payment instructions</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-white/70">{inv.paymentInstructions}</p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="font-display text-xl text-white">Accounting notes</h2>
        <ul className="mt-4 space-y-4 text-sm">
          {inv.accountingNotes.map((n) => (
            <li key={n.id} className="border-b border-white/5 pb-4">
              <p className="text-white/80">{n.body}</p>
              <p className="mt-2 text-xs text-white/45">
                {n.createdAt.toLocaleString()} · {n.isOwnerActor ? "Owner" : n.authorType.toLowerCase()}
              </p>
            </li>
          ))}
          {inv.accountingNotes.length === 0 ? <li className="text-white/45">No notes yet.</li> : null}
        </ul>
        <AccountingNoteComposer invoiceId={inv.id} disabled={!ctx.permissions.canAddAccountingNotes} />
      </section>
    </div>
  );
}
