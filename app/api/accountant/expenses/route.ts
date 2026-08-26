import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  assertPermission,
  auditAccountantAction,
  getAccountantPortalContextFromRequest,
} from "@/lib/accountant/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().optional(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  take: z.coerce.number().min(1).max(100).default(50),
  skip: z.coerce.number().min(0).default(0),
});

const PostBody = z.object({
  amount: z.union([z.string(), z.number()]),
  category: z.string().min(1),
  date: z.string().optional(),
  projectId: z.string().optional().nullable(),
  studioClientId: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const ctx = await getAccountantPortalContextFromRequest(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  try {
    assertPermission(ctx, "canViewExpenses");
  } catch (e: unknown) {
    const st = typeof e === "object" && e && "status" in e ? (e as { status: number }).status : 403;
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: st });
  }

  const url = new URL(req.url);
  const q = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!q.success) {
    return NextResponse.json({ ok: false, error: "Invalid query." }, { status: 400 });
  }

  const where: Prisma.StudioExpenseWhereInput = {};
  if (q.data.projectId) where.projectId = q.data.projectId;
  if (q.data.clientId) where.studioClientId = q.data.clientId;
  if (q.data.category) where.category = { contains: q.data.category, mode: "insensitive" };
  if (q.data.from || q.data.to) {
    where.date = {};
    if (q.data.from) {
      const d = new Date(q.data.from);
      if (!Number.isNaN(d.getTime())) where.date.gte = d;
    }
    if (q.data.to) {
      const d = new Date(q.data.to);
      if (!Number.isNaN(d.getTime())) where.date.lte = d;
    }
  }

  const [expenses, total] = await prisma.$transaction([
    prisma.studioExpense.findMany({
      where,
      orderBy: { date: "desc" },
      take: q.data.take,
      skip: q.data.skip,
      select: {
        id: true,
        amount: true,
        category: true,
        date: true,
        title: true,
        vendor: true,
        description: true,
        paymentMethod: true,
        note: true,
        receiptKey: true,
        project: {
          select: ctx.permissions.canViewProjectFinancials
            ? {
                id: true,
                title: true,
                client: true,
                totalPrice: true,
                balanceRemaining: true,
              }
            : { id: true, title: true, client: true },
        },
        studioClient: { select: { id: true, companyName: true } },
        _count: { select: { accountingReceipts: true } },
      },
    }),
    prisma.studioExpense.count({ where }),
  ]);

  return NextResponse.json({ ok: true, expenses, total, hasMore: q.data.skip + expenses.length < total });
}

export async function POST(req: Request) {
  const ctx = await getAccountantPortalContextFromRequest(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  try {
    assertPermission(ctx, "canCreateExpenses");
  } catch (e: unknown) {
    const st = typeof e === "object" && e && "status" in e ? (e as { status: number }).status : 403;
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: st });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = PostBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }

  const amt = String(parsed.data.amount);
  const date = parsed.data.date ? new Date(parsed.data.date) : new Date();
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ ok: false, error: "Invalid date." }, { status: 400 });
  }

  const row = await prisma.studioExpense.create({
    data: {
      amount: amt,
      category: parsed.data.category.trim(),
      date,
      projectId: parsed.data.projectId ?? undefined,
      studioClientId: parsed.data.studioClientId ?? undefined,
      title: parsed.data.title ?? undefined,
      vendor: parsed.data.vendor ?? undefined,
      description: parsed.data.description ?? undefined,
      paymentMethod: parsed.data.paymentMethod ?? undefined,
      note: parsed.data.note ?? undefined,
    },
    select: { id: true },
  });

  await auditAccountantAction({
    ctx,
    action: "accountant.expense.create",
    entityType: "StudioExpense",
    entityId: row.id,
    req,
  });

  return NextResponse.json({ ok: true, id: row.id });
}
