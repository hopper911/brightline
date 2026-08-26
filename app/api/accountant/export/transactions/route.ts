import { NextResponse } from "next/server";
import { z } from "zod";
import { assertPermission, auditAccountantAction, getAccountantPortalContextFromRequest } from "@/lib/accountant/auth";
import { rowsToCsv } from "@/lib/accountant/csv";
import { loadUnifiedLedger } from "@/lib/accountant/ledger-query";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Q = z.object({
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

  let from: Date | undefined;
  let to: Date | undefined;
  if (parsed.data.from) {
    const d = new Date(parsed.data.from);
    if (!Number.isNaN(d.getTime())) from = d;
  }
  if (parsed.data.to) {
    const d = new Date(parsed.data.to);
    if (!Number.isNaN(d.getTime())) to = d;
  }

  const rows = await loadUnifiedLedger(prisma, { from, to });
  const csv = rowsToCsv(
    ["date", "source", "ledgerType", "category", "description", "amount", "client", "project", "invoiceNumber"],
    rows.map((r) => [
      r.transactionDate.toISOString(),
      r.source,
      r.ledgerType,
      r.category,
      r.description,
      r.amount,
      r.clientName ?? "",
      r.projectTitle ?? "",
      r.invoiceNumber ?? "",
    ])
  );

  const stamp = new Date().toISOString().slice(0, 7);
  await auditAccountantAction({
    ctx,
    action: "accountant.export.transactions",
    metadata: { rowCount: rows.length },
    req,
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="brightline-transactions-report-${stamp}.csv"`,
    },
  });
}
