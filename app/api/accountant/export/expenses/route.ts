import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { assertPermission, auditAccountantAction, getAccountantPortalContextFromRequest } from "@/lib/accountant/auth";
import { rowsToCsv } from "@/lib/accountant/csv";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Q = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().optional(),
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

  const where: Prisma.StudioExpenseWhereInput = {};
  if (parsed.data.category) {
    where.category = { contains: parsed.data.category, mode: "insensitive" };
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

  const rows = await prisma.studioExpense.findMany({
    where,
    orderBy: { date: "desc" },
    take: 8000,
    select: {
      date: true,
      amount: true,
      category: true,
      title: true,
      vendor: true,
      paymentMethod: true,
      note: true,
      project: { select: { title: true, client: true } },
      studioClient: { select: { companyName: true } },
    },
  });

  const csv = rowsToCsv(
    ["date", "amount", "category", "title", "vendor", "client", "project", "paymentMethod", "note"],
    rows.map((r) => [
      r.date.toISOString(),
      r.amount.toString(),
      r.category,
      r.title ?? "",
      r.vendor ?? "",
      r.studioClient?.companyName ?? r.project?.client ?? "",
      r.project?.title ?? "",
      r.paymentMethod ?? "",
      r.note ?? "",
    ])
  );

  const stamp = new Date().toISOString().slice(0, 7);
  await auditAccountantAction({
    ctx,
    action: "accountant.export.expenses",
    metadata: { rowCount: rows.length },
    req,
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="brightline-expenses-report-${stamp}.csv"`,
    },
  });
}
