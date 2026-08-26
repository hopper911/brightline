import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";
import { rejectIfTokenDownloadLimited } from "@/lib/client-token-rate-limit";
import { pdfToBuffer } from "@/lib/delivery/package";
import { findValidFinalPackageProject } from "@/lib/final-package-access";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function money(value: { toString(): string } | null | undefined) {
  return Number(value?.toString() ?? 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export async function GET(
  req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const limited = await rejectIfTokenDownloadLimited(req, token, "final-pkg-invoice", {
    max: 30,
    windowMs: 60 * 60_000,
  });
  if (limited) return limited;

  const project = await findValidFinalPackageProject(token);
  if (!project?.attachedInvoiceId) {
    return NextResponse.json({ ok: false, error: "Invoice not attached." }, { status: 404 });
  }
  const invoice = await prisma.studioInvoice.findUnique({
    where: { id: project.attachedInvoiceId },
    include: { client: true, project: true, lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!invoice) return NextResponse.json({ ok: false, error: "Invoice not found." }, { status: 404 });

  const doc = new PDFDocument({ size: "LETTER", margin: 54 });
  doc.font("Helvetica-Bold").fontSize(11).text("BRIGHTLINE PHOTOGRAPHY", { characterSpacing: 1.8 });
  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(26).text(`Invoice #${invoice.invoiceNumber}`);
  doc.font("Helvetica").fontSize(10).fillColor("#555555").text(invoice.client.companyName);
  doc.text(invoice.project?.title ?? project.title);
  doc.text(`Status: ${invoice.status}`);
  doc.moveDown(1);
  for (const line of invoice.lineItems) {
    doc.text(`${line.name} — ${line.quantity.toString()} x ${money(line.unitPrice)} = ${money(line.amount)}`);
  }
  doc.moveDown(1);
  doc.font("Helvetica-Bold").fillColor("#111111").text(`Total: ${money(invoice.total)}`);
  doc.text(`Amount paid: ${money(invoice.amountPaid)}`);
  doc.text(`Balance due: ${money(invoice.balanceRemaining)}`);
  doc.moveDown(1);
  doc.font("Helvetica").fontSize(9).fillColor("#555555").text(invoice.notes || "Payment instructions will be provided by BRIGHTLINE Photography.");

  const buffer = await pdfToBuffer(doc);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="brightline-invoice-${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
