import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { recalculateInvoiceFinance } from "@/lib/studio/invoicing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string; lineItemId: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id: invoiceId, lineItemId } = await context.params;

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const line = await tx.studioInvoiceLineItem.findFirst({
        where: { id: lineItemId, invoiceId },
      });
      if (!line) throw new Error("Line item not found.");
      await tx.studioInvoiceLineItem.delete({ where: { id: lineItemId } });
      return recalculateInvoiceFinance(tx, invoiceId);
    });
    return NextResponse.json({ ok: true, invoice });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
