import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertPermission,
  auditAccountantAction,
  getAccountantPortalContextFromRequest,
} from "@/lib/accountant/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PatchBody = z.object({
  amount: z.union([z.string(), z.number()]).optional(),
  category: z.string().min(1).optional(),
  date: z.string().optional(),
  projectId: z.string().optional().nullable(),
  studioClientId: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const portal = await getAccountantPortalContextFromRequest(req);
  if (!portal) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  try {
    assertPermission(portal, "canEditExpenses");
  } catch (e: unknown) {
    const st = typeof e === "object" && e && "status" in e ? (e as { status: number }).status : 403;
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: st });
  }

  const { id } = await ctx.params;
  const existing = await prisma.studioExpense.findUnique({
    where: { id },
    select: { id: true, category: true },
  });
  if (!existing) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.amount !== undefined) data.amount = String(parsed.data.amount);
  if (parsed.data.category !== undefined) {
    const nextCat = parsed.data.category.trim();
    if (existing.category !== nextCat && !portal.permissions.canEditExpenseCategories) {
      return NextResponse.json({ ok: false, error: "Category edits require permission." }, { status: 403 });
    }
    data.category = nextCat;
  }
  if (parsed.data.date !== undefined) {
    const d = new Date(parsed.data.date);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ ok: false, error: "Invalid date." }, { status: 400 });
    }
    data.date = d;
  }
  if (parsed.data.projectId !== undefined) data.projectId = parsed.data.projectId;
  if (parsed.data.studioClientId !== undefined) data.studioClientId = parsed.data.studioClientId;
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (parsed.data.vendor !== undefined) data.vendor = parsed.data.vendor;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.paymentMethod !== undefined) data.paymentMethod = parsed.data.paymentMethod;
  if (parsed.data.note !== undefined) data.note = parsed.data.note;

  await prisma.studioExpense.update({ where: { id }, data });

  await auditAccountantAction({
    ctx: portal,
    action: "accountant.expense.update",
    entityType: "StudioExpense",
    entityId: id,
    req,
  });

  return NextResponse.json({ ok: true });
}
