import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { recalculateInvoiceFinance } from "@/lib/studio/invoicing";
import { cleanText } from "@/lib/delivery/package";
import { lineAmount, parseDecimal } from "@/lib/delivery/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ lineItemId: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { lineItemId } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const current = await prisma.studioInvoiceLineItem.findUnique({ where: { id: lineItemId } });
  if (!current) return NextResponse.json({ ok: false, error: "Line item not found." }, { status: 404 });
  const quantity = body.quantity !== undefined ? parseDecimal(body.quantity, 1) : current.quantity;
  const rate = body.rate !== undefined ? parseDecimal(body.rate) : current.unitPrice;
  const lineItem = await prisma.studioInvoiceLineItem.update({
    where: { id: lineItemId },
    data: {
      name: body.description !== undefined ? cleanText(body.description) ?? current.name : undefined,
      quantity: body.quantity !== undefined ? quantity : undefined,
      unitPrice: body.rate !== undefined ? rate : undefined,
      amount: lineAmount(quantity, rate),
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : undefined,
    },
  });
  await prisma.$transaction((tx) => recalculateInvoiceFinance(tx, current.invoiceId));
  return NextResponse.json({ ok: true, lineItem });
}

