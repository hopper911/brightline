import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { InvoiceDetailEditor } from "./InvoiceDetailEditor";

export const dynamic = "force-dynamic";

export default async function StudioInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const { id } = await params;

  const [invoice, templates] = await Promise.all([
    prisma.studioInvoice.findUnique({
      where: { id },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" }, include: { mediaLinks: true } },
        client: { select: { companyName: true } },
        project: { select: { id: true, title: true } },
      },
    }),
    prisma.studioServiceTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!invoice) notFound();

  const initialInvoice = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    subtotal: invoice.subtotal.toString(),
    tax: invoice.tax.toString(),
    discount: invoice.discount.toString(),
    total: invoice.total.toString(),
    amountPaid: invoice.amountPaid.toString(),
    balanceRemaining: invoice.balanceRemaining.toString(),
    notes: invoice.notes,
    issuedAt: invoice.issuedAt?.toISOString() ?? null,
    dueAt: invoice.dueAt?.toISOString() ?? null,
    sentAt: invoice.sentAt?.toISOString() ?? null,
    lineItems: invoice.lineItems.map((li) => ({
      id: li.id,
      name: li.name,
      type: li.type,
      unitLabel: li.unitLabel,
      unitPrice: li.unitPrice.toString(),
      quantity: li.quantity.toString(),
      amount: li.amount.toString(),
      sortOrder: li.sortOrder,
      serviceTemplateId: li.serviceTemplateId,
      mediaLinks: li.mediaLinks.map((m) => ({
        id: m.id,
        studioMediaId: m.studioMediaId,
        galleryImageId: m.galleryImageId,
      })),
    })),
    client: invoice.client,
    project: invoice.project,
  };

  const templateRows = templates.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    unitLabel: t.unitLabel,
    defaultPrice: t.defaultPrice.toString(),
    maxPrice: t.maxPrice?.toString() ?? null,
  }));

  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <Link href="/studio/invoices" className="text-xs uppercase tracking-[0.25em] text-white/45 hover:text-white/80">
        ← Invoices
      </Link>
      <InvoiceDetailEditor initialInvoice={initialInvoice} templates={templateRows} />
    </main>
  );
}
