import { NextResponse } from "next/server";
import { z } from "zod";
import { assertPermission, getAccountantPortalContextFromRequest } from "@/lib/accountant/auth";
import { loadUnifiedLedger } from "@/lib/accountant/ledger-query";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  source: z.enum(["payment", "expense", "adjustment"]).optional(),
});

export async function GET(req: Request) {
  const ctx = await getAccountantPortalContextFromRequest(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  try {
    assertPermission(ctx, "canViewTransactions");
  } catch (e: unknown) {
    const st = typeof e === "object" && e && "status" in e ? (e as { status: number }).status : 403;
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: st });
  }

  const url = new URL(req.url);
  const q = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!q.success) {
    return NextResponse.json({ ok: false, error: "Invalid query." }, { status: 400 });
  }

  let from: Date | undefined;
  let to: Date | undefined;
  if (q.data.from) {
    const d = new Date(q.data.from);
    if (!Number.isNaN(d.getTime())) from = d;
  }
  if (q.data.to) {
    const d = new Date(q.data.to);
    if (!Number.isNaN(d.getTime())) to = d;
  }

  let rows = await loadUnifiedLedger(prisma, { from, to });
  if (q.data.source) {
    rows = rows.filter((r) => r.source === q.data.source);
  }

  return NextResponse.json({
    ok: true,
    transactions: rows.map((r) => ({
      ...r,
      transactionDate: r.transactionDate.toISOString(),
    })),
    total: rows.length,
  });
}
