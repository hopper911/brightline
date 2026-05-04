import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { recalculateInvoiceFinance } from "@/lib/studio/invoicing";
import { cleanText } from "@/lib/delivery/package";
import { lineAmount, parseDecimal } from "@/lib/delivery/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
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
  const quantity = parseDecimal(body.quantity, 1);
  const rate = parseDecimal(body.rate);
  const last = await prisma.studioInvoiceLineItem.findFirst({
    where: { invoiceId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  const lineItem = await prisma.studioInvoiceLineItem.create({
    data: {
      invoiceId,
      name: cleanText(body.description) ?? "Photography services",
      type: "FLAT",
      unitLabel: cleanText(body.unitLabel) ?? "item",
      quantity,
      unitPrice: rate,
      amount: lineAmount(quantity, rate),
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });
  await prisma.$transaction((tx) => recalculateInvoiceFinance(tx, invoiceId));
  return NextResponse.json({ ok: true, lineItem });
}

