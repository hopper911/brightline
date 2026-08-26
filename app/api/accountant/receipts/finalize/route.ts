import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertPermission,
  auditAccountantAction,
  getAccountantPortalContextFromRequest,
} from "@/lib/accountant/auth";
import { isAccountingPrivateKey } from "@/lib/accountant/r2-keys";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = 15 * 1024 * 1024;

const Body = z.object({
  key: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive().max(MAX_BYTES),
  studioExpenseId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const ctx = await getAccountantPortalContextFromRequest(req);
  if (!ctx) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  try {
    assertPermission(ctx, "canUploadReceipts");
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

  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid body." }, { status: 400 });
  }

  const kNorm = parsed.data.key.replace(/^\//, "");
  if (!isAccountingPrivateKey(kNorm) || !kNorm.startsWith("accounting/receipts/")) {
    return NextResponse.json({ ok: false, error: "Invalid key." }, { status: 400 });
  }

  const mt = parsed.data.mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED.has(mt)) {
    return NextResponse.json({ ok: false, error: "Unsupported file type." }, { status: 400 });
  }

  if (parsed.data.studioExpenseId) {
    const exp = await prisma.studioExpense.findUnique({
      where: { id: parsed.data.studioExpenseId },
      select: { id: true },
    });
    if (!exp) {
      return NextResponse.json({ ok: false, error: "Expense not found." }, { status: 404 });
    }
  }

  const row = await prisma.accountingReceipt.create({
    data: {
      r2Key: kNorm,
      fileName: parsed.data.fileName,
      mimeType: mt,
      sizeBytes: parsed.data.sizeBytes,
      studioExpenseId: parsed.data.studioExpenseId ?? undefined,
      uploadedByAccountantId: ctx.kind === "accountant" ? ctx.accountantAccess.id : undefined,
    },
    select: { id: true },
  });

  if (parsed.data.studioExpenseId) {
    await prisma.studioExpense.update({
      where: { id: parsed.data.studioExpenseId },
      data: { receiptKey: kNorm, receiptFilename: parsed.data.fileName, receiptContentType: mt },
    });
  }

  await auditAccountantAction({
    ctx,
    action: "accountant.receipt.finalize",
    entityType: "AccountingReceipt",
    entityId: row.id,
    metadata: { key: kNorm, expenseId: parsed.data.studioExpenseId ?? null },
    req,
  });

  return NextResponse.json({ ok: true, receiptId: row.id });
}
