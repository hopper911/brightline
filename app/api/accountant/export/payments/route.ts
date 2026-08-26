import { NextResponse } from "next/server";
import { PaymentType, Prisma } from "@prisma/client";
import { z } from "zod";
import { assertPermission, auditAccountantAction, getAccountantPortalContextFromRequest } from "@/lib/accountant/auth";
import { rowsToCsv } from "@/lib/accountant/csv";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Q = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.nativeEnum(PaymentType).optional(),
});

export async function GET(req: Request) {
  const ctx = await getAccountantPortalContextFromRequest(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  try {
    assertPermission(ctx, "canExportReports");
  } catch (e: unknown) {
    const st = typeof e === "object" && e && "status" in e ? (e as { status: number }).status : 403;
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: st });
  }

  const url = new URL(req.url);
  const parsed = Q.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid query." }, { status: 400 });
  }

  const where: Prisma.StudioPaymentWhereInput = {};
  if (parsed.data.type) {
    where.type = parsed.data.type;
  }
  if (parsed.data.from || parsed.data.to) {
    where.date = {};
    if (parsed.data.from) {
      const d = new Date(parsed.data.from);
      if (!Number.isNaN(d.getTime())) where.date.gte = d;
    }
    if (parsed.data.to) {
      const d = new Date(parsed.data.to);
      if (!Number.isNaN(d.getTime())) where.date.lte = d;
    }
  }

  const rows = await prisma.studioPayment.findMany({
    where,
    orderBy: { date: "desc" },
    take: 8000,
    select: {
      date: true,
      amount: true,
      type: true,
      recordStatus: true,
      paymentMethod: true,
      note: true,
      project: { select: { title: true, client: true } },
      invoice: { select: { invoiceNumber: true } },
    },
  });

  const csv = rowsToCsv(
    ["date", "amount", "type", "recordStatus", "paymentMethod", "client", "project", "invoiceNumber", "note"],
    rows.map((r) => [
      r.date.toISOString(),
      r.amount.toString(),
      r.type,
      r.recordStatus,
      r.paymentMethod ?? "",
      r.project.client,
      r.project.title,
      r.invoice ? String(r.invoice.invoiceNumber) : "",
      r.note ?? "",
    ])
  );

  const stamp = new Date().toISOString().slice(0, 7);
  await auditAccountantAction({ ctx, action: "accountant.export.payments", metadata: { rowCount: rows.length }, req });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="brightline-payments-report-${stamp}.csv"`,
    },
  });
}
