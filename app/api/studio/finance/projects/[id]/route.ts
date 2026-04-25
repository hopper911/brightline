import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  normalizePaymentStatus,
  parseMoney,
  recalculateProjectFinance,
} from "@/lib/studio/finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const explicitStatus = normalizePaymentStatus(body.paymentStatus);
    const project = await prisma.$transaction(async (tx) => {
      await tx.studioProject.update({
        where: { id },
        data: {
          totalPrice: body.totalPrice === undefined ? undefined : parseMoney(body.totalPrice, "totalPrice"),
          depositAmount:
            body.depositAmount === undefined ? undefined : parseMoney(body.depositAmount, "depositAmount"),
          paymentStatus: explicitStatus,
        },
      });
      return recalculateProjectFinance(tx, id, explicitStatus);
    });
    return NextResponse.json({ ok: true, project });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update project finance.";
    const status = message.includes("not found") ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
