import { NextResponse } from "next/server";
import { AccountingNoteAuthorType, Prisma } from "@prisma/client";
import { z } from "zod";
import {
  assertPermission,
  auditAccountantAction,
  getAccountantPortalContextFromRequest,
} from "@/lib/accountant/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PostBody = z
  .object({
    body: z.string().min(1),
    studioInvoiceId: z.string().optional(),
    studioExpenseId: z.string().optional(),
    studioPaymentId: z.string().optional(),
    studioProjectId: z.string().optional(),
    studioClientId: z.string().optional(),
    ledgerAdjustmentId: z.string().optional(),
  })
  .refine(
    (d) =>
      [d.studioInvoiceId, d.studioExpenseId, d.studioPaymentId, d.studioProjectId, d.studioClientId, d.ledgerAdjustmentId].filter(
        Boolean
      ).length === 1,
    { message: "Exactly one entity link is required." }
  );

const QuerySchema = z.object({
  studioInvoiceId: z.string().optional(),
  studioExpenseId: z.string().optional(),
  studioPaymentId: z.string().optional(),
  studioProjectId: z.string().optional(),
  studioClientId: z.string().optional(),
  ledgerAdjustmentId: z.string().optional(),
  take: z.coerce.number().min(1).max(100).default(50),
});

export async function GET(req: Request) {
  const ctx = await getAccountantPortalContextFromRequest(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const url = new URL(req.url);
  const q = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!q.success) {
    return NextResponse.json({ ok: false, error: "Invalid query." }, { status: 400 });
  }

  try {
    if (q.data.studioInvoiceId) assertPermission(ctx, "canViewInvoices");
    else if (q.data.studioExpenseId) assertPermission(ctx, "canViewExpenses");
    else if (q.data.studioPaymentId) assertPermission(ctx, "canViewPayments");
    else if (q.data.studioProjectId || q.data.studioClientId || q.data.ledgerAdjustmentId) {
      assertPermission(ctx, "canViewTransactions");
    } else {
      return NextResponse.json({ ok: false, error: "Filter required." }, { status: 400 });
    }
  } catch (e: unknown) {
    const st = typeof e === "object" && e && "status" in e ? (e as { status: number }).status : 403;
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: st });
  }

  const where: Prisma.AccountingNoteWhereInput = {};
  if (q.data.studioInvoiceId) where.studioInvoiceId = q.data.studioInvoiceId;
  else if (q.data.studioExpenseId) where.studioExpenseId = q.data.studioExpenseId;
  else if (q.data.studioPaymentId) where.studioPaymentId = q.data.studioPaymentId;
  else if (q.data.studioProjectId) where.studioProjectId = q.data.studioProjectId;
  else if (q.data.studioClientId) where.studioClientId = q.data.studioClientId;
  else if (q.data.ledgerAdjustmentId) where.ledgerAdjustmentId = q.data.ledgerAdjustmentId;

  const notes = await prisma.accountingNote.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: q.data.take,
    select: {
      id: true,
      body: true,
      createdAt: true,
      authorType: true,
      isOwnerActor: true,
    },
  });

  return NextResponse.json({ ok: true, notes });
}

export async function POST(req: Request) {
  const ctx = await getAccountantPortalContextFromRequest(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  try {
    assertPermission(ctx, "canAddAccountingNotes");
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

  const authorType =
    ctx.kind === "owner" ? AccountingNoteAuthorType.OWNER : AccountingNoteAuthorType.ACCOUNTANT;

  const row = await prisma.accountingNote.create({
    data: {
      body: parsed.data.body.trim(),
      authorType,
      isOwnerActor: ctx.kind === "owner",
      accountantAccessId: ctx.kind === "accountant" ? ctx.accountantAccess.id : undefined,
      studioInvoiceId: parsed.data.studioInvoiceId,
      studioExpenseId: parsed.data.studioExpenseId,
      studioPaymentId: parsed.data.studioPaymentId,
      studioProjectId: parsed.data.studioProjectId,
      studioClientId: parsed.data.studioClientId,
      ledgerAdjustmentId: parsed.data.ledgerAdjustmentId,
    },
    select: { id: true },
  });

  await auditAccountantAction({
    ctx,
    action: "accountant.note.create",
    entityType: "AccountingNote",
    entityId: row.id,
    req,
  });

  return NextResponse.json({ ok: true, id: row.id });
}
