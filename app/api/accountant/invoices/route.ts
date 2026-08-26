import { NextResponse } from "next/server";
import { Prisma, StudioInvoiceStatus } from "@prisma/client";
import { z } from "zod";
import { assertPermission, getAccountantPortalContextFromRequest } from "@/lib/accountant/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  status: z.nativeEnum(StudioInvoiceStatus).optional(),
  clientId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
  take: z.coerce.number().min(1).max(100).default(50),
  skip: z.coerce.number().min(0).default(0),
});

export async function GET(req: Request) {
  const ctx = await getAccountantPortalContextFromRequest(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  try {
    assertPermission(ctx, "canViewInvoices");
  } catch (e: unknown) {
    const st = typeof e === "object" && e && "status" in e ? (e as { status: number }).status : 403;
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: st });
  }

  const url = new URL(req.url);
  const q = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!q.success) {
    return NextResponse.json({ ok: false, error: "Invalid query." }, { status: 400 });
  }

  const where: Prisma.StudioInvoiceWhereInput = {};
  if (q.data.status) where.status = q.data.status;
  if (q.data.clientId) where.clientId = q.data.clientId;
  if (q.data.from || q.data.to) {
    where.issuedAt = {};
    if (q.data.from) {
      const d = new Date(q.data.from);
      if (!Number.isNaN(d.getTime())) where.issuedAt.gte = d;
    }
    if (q.data.to) {
      const d = new Date(q.data.to);
      if (!Number.isNaN(d.getTime())) where.issuedAt.lte = d;
    }
  }
  if (q.data.q?.trim()) {
    const n = Number(q.data.q.trim());
    where.OR = [
      { client: { companyName: { contains: q.data.q.trim(), mode: "insensitive" } } },
      ...(Number.isFinite(n) ? [{ invoiceNumber: n }] : []),
    ];
  }

  const [invoices, total] = await prisma.$transaction([
    prisma.studioInvoice.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      take: q.data.take,
      skip: q.data.skip,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        issuedAt: true,
        dueAt: true,
        total: true,
        amountPaid: true,
        balanceRemaining: true,
        client: { select: { id: true, companyName: true } },
        project: {
          select: ctx.permissions.canViewProjectFinancials
            ? { id: true, title: true, totalPrice: true, balanceRemaining: true }
            : { id: true, title: true },
        },
        pdfStorageKey: true,
      },
    }),
    prisma.studioInvoice.count({ where }),
  ]);

  return NextResponse.json({ ok: true, invoices, total, hasMore: q.data.skip + invoices.length < total });
}
