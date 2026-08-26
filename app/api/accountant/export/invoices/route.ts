import { NextResponse } from "next/server";
import { Prisma, StudioInvoiceStatus } from "@prisma/client";
import { assertPermission, auditAccountantAction, getAccountantPortalContextFromRequest } from "@/lib/accountant/auth";
import { invoiceStatusLabel } from "@/lib/accountant/invoice-status";
import { rowsToCsv } from "@/lib/accountant/csv";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Q = z.object({
  status: z.nativeEnum(StudioInvoiceStatus).optional(),
  clientId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
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

  const where: Prisma.StudioInvoiceWhereInput = {};
  if (parsed.data.status) where.status = parsed.data.status;
  if (parsed.data.clientId) where.clientId = parsed.data.clientId;
  if (parsed.data.from || parsed.data.to) {
    where.issuedAt = {};
    if (parsed.data.from) {
      const d = new Date(parsed.data.from);
      if (!Number.isNaN(d.getTime())) where.issuedAt.gte = d;
    }
    if (parsed.data.to) {
      const d = new Date(parsed.data.to);
      if (!Number.isNaN(d.getTime())) where.issuedAt.lte = d;
    }
  }

  const rows = await prisma.studioInvoice.findMany({
    where,
    orderBy: { issuedAt: "desc" },
    take: 5000,
    select: {
      invoiceNumber: true,
      status: true,
      issuedAt: true,
      dueAt: true,
      total: true,
      amountPaid: true,
      balanceRemaining: true,
      client: { select: { companyName: true } },
      project: { select: { title: true } },
    },
  });

  const csv = rowsToCsv(
    ["invoiceNumber", "status", "client", "project", "issuedAt", "dueAt", "total", "amountPaid", "balanceRemaining"],
    rows.map((r) => [
      r.invoiceNumber,
      invoiceStatusLabel(r.status),
      r.client.companyName,
      r.project?.title ?? "",
      r.issuedAt ? r.issuedAt.toISOString() : "",
      r.dueAt ? r.dueAt.toISOString() : "",
      r.total.toString(),
      r.amountPaid.toString(),
      r.balanceRemaining.toString(),
    ])
  );

  const stamp = new Date().toISOString().slice(0, 7);
  await auditAccountantAction({
    ctx,
    action: "accountant.export.invoices",
    metadata: { rowCount: rows.length },
    req,
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="brightline-invoices-report-${stamp}.csv"`,
    },
  });
}
