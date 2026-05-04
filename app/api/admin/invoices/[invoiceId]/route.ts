import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { recalculateInvoiceFinance } from "@/lib/studio/invoicing";
import { cleanText } from "@/lib/delivery/package";
import { normalizeInvoiceStatus, parseDecimal } from "@/lib/delivery/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ invoiceId: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { invoiceId } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const explicitStatus = normalizeInvoiceStatus(body.status);
  const invoice = await prisma.$transaction(async (tx) => {
    await tx.studioInvoice.update({
      where: { id: invoiceId },
      data: {
        status: explicitStatus,
        issuedAt: body.issueDate !== undefined ? (body.issueDate ? new Date(String(body.issueDate)) : null) : undefined,
        dueAt: body.dueDate !== undefined ? (body.dueDate ? new Date(String(body.dueDate)) : null) : undefined,
        discount: body.discount !== undefined ? parseDecimal(body.discount) : undefined,
        tax: body.tax !== undefined ? parseDecimal(body.tax) : undefined,
        amountPaid: body.amountPaid !== undefined ? parseDecimal(body.amountPaid) : undefined,
        paymentInstructions: body.paymentInstructions !== undefined ? cleanText(body.paymentInstructions) : undefined,
        notes: body.notes !== undefined ? cleanText(body.notes) : undefined,
        deliveryPackageId: body.deliveryPackageId !== undefined ? cleanText(body.deliveryPackageId) : undefined,
      },
    });
    return recalculateInvoiceFinance(tx, invoiceId, explicitStatus);
  });
  return NextResponse.json({ ok: true, invoice });
}

