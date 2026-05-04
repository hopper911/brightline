import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { pdfToBuffer } from "@/lib/delivery/package";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function money(value: { toString(): string } | number | null | undefined) {
  return Number(value?.toString() ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  const project = await prisma.workProject.findUnique({ where: { id }, select: { title: true, attachedInvoiceId: true } });
  if (!project?.attachedInvoiceId) {
    return NextResponse.json({ ok: false, error: "No invoice attached to this delivery package." }, { status: 404 });
  }

  const invoice = await prisma.studioInvoice.findUnique({
    where: { id: project.attachedInvoiceId },
    include: { client: true, project: true, lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!invoice) {
    return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });
  }

  const doc = new PDFDocument({ size: "LETTER", margin: 54, info: { Title: `Invoice ${invoice.invoiceNumber}` } });
  doc.font("Helvetica-Bold").fontSize(11).text("BRIGHTLINE PHOTOGRAPHY", { characterSpacing: 1.8 });
  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(26).text(`Invoice #${invoice.invoiceNumber}`);
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(10).fillColor("#555555").text(invoice.client.companyName);
  doc.text(invoice.project?.title ?? project.title);
  doc.text(`Status: ${invoice.status}`);
  if (invoice.issuedAt) doc.text(`Issue date: ${invoice.issuedAt.toLocaleDateString()}`);
  if (invoice.dueAt) doc.text(`Due date: ${invoice.dueAt.toLocaleDateString()}`);
  doc.moveDown(1.2);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111111").text("Line items");
  doc.moveDown(0.4);
  for (const line of invoice.lineItems) {
    doc.font("Helvetica").fontSize(9).fillColor("#333333").text(
      `${line.name} — ${line.quantity.toString()} ${line.unitLabel} x ${money(line.unitPrice)} = ${money(line.amount)}`
    );
  }
  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111111").text(`Subtotal: ${money(invoice.subtotal)}`);
  doc.text(`Discount: ${money(invoice.discount)}`);
  doc.text(`Tax: ${money(invoice.tax)}`);
  doc.text(`Total: ${money(invoice.total)}`);
  doc.text(`Amount paid: ${money(invoice.amountPaid)}`);
  doc.text(`Balance due: ${money(invoice.balanceRemaining)}`);
  doc.moveDown(1);
  doc.font("Helvetica").fontSize(9).fillColor("#555555").text(invoice.notes || "Payment instructions will be provided by BRIGHTLINE Photography.");
  doc.moveDown(2);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#111111").text("Thank you.");

  const buffer = await pdfToBuffer(doc);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="brightline-invoice-${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

