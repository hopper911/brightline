import { prisma } from "@/lib/prisma";

/** Admin invoice detail — single source for `include` shape on `/api/studio/invoices/[id]`. */
const STUDIO_INVOICE_DETAIL_INCLUDE = {
  lineItems: { orderBy: { sortOrder: "asc" as const }, include: { mediaLinks: true } },
  client: { select: { id: true, companyName: true, email: true } },
  project: { select: { id: true, title: true, slug: true } },
} as const;

export async function getStudioInvoiceDetailForAdmin(id: string) {
  return prisma.studioInvoice.findUnique({
    where: { id },
    include: STUDIO_INVOICE_DETAIL_INCLUDE,
  });
}
