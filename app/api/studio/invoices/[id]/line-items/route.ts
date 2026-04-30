import { type ServiceTemplateType } from "@prisma/client";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { asNullableString, parseMoney, parsePositiveMoney } from "@/lib/studio/finance";
import { lineAmount, recalculateInvoiceFinance } from "@/lib/studio/invoicing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeTemplateType(value: unknown): ServiceTemplateType {
  const upper = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (upper === "PER_IMAGE" || upper === "FLAT" || upper === "HOURLY" || upper === "CANCELLATION") {
    return upper as ServiceTemplateType;
  }
  return "FLAT";
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id: invoiceId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const items = body.items;
  if (!Array.isArray(items)) {
    return NextResponse.json({ ok: false, error: "items[] is required." }, { status: 400 });
  }

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.studioInvoice.findUnique({ where: { id: invoiceId }, select: { id: true } });
      if (!inv) throw new Error("Invoice not found.");

      let sortBase =
        (await tx.studioInvoiceLineItem.aggregate({
          where: { invoiceId },
          _max: { sortOrder: true },
        }))._max.sortOrder ?? -1;

      for (const raw of items as Record<string, unknown>[]) {
        const name = asNullableString(raw.name);
        if (!name) throw new Error("Each line item needs a name.");

        const unitPrice = parseMoney(raw.unitPrice, "unitPrice");
        const quantity = parsePositiveMoney(raw.quantity, "quantity");
        const type = normalizeTemplateType(raw.type);
        const unitLabel = asNullableString(raw.unitLabel) || "unit";
        const serviceTemplateId = asNullableString(raw.serviceTemplateId);
        const lineId = asNullableString(raw.id);
        const amount = lineAmount(unitPrice, quantity);

        const sortOrderUpdate =
          typeof raw.sortOrder === "number"
            ? raw.sortOrder
            : typeof raw.sortOrder === "string" && raw.sortOrder.trim() !== ""
              ? Number.parseInt(raw.sortOrder, 10)
              : undefined;

        if (lineId) {
          await tx.studioInvoiceLineItem.update({
            where: { id: lineId, invoiceId },
            data: {
              name,
              type,
              unitLabel,
              unitPrice,
              quantity,
              amount,
              serviceTemplateId: serviceTemplateId ?? null,
              ...(Number.isFinite(sortOrderUpdate) ? { sortOrder: sortOrderUpdate! } : {}),
            },
          });
        } else {
          sortBase += 1;
          await tx.studioInvoiceLineItem.create({
            data: {
              invoiceId,
              name,
              type,
              unitLabel,
              unitPrice,
              quantity,
              amount,
              serviceTemplateId: serviceTemplateId ?? undefined,
              sortOrder:
                Number.isFinite(sortOrderUpdate)
                  ? sortOrderUpdate!
                  : sortBase,
            },
          });
        }
      }

      return recalculateInvoiceFinance(tx, invoiceId);
    });

    return NextResponse.json({ ok: true, invoice });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
