import { NextResponse } from "next/server";
import { z } from "zod";
import { assertPermission, getAccountantPortalContextFromRequest } from "@/lib/accountant/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Q = z.object({
  take: z.coerce.number().min(1).max(100).default(40),
  skip: z.coerce.number().min(0).default(0),
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
  const q = Q.safeParse(Object.fromEntries(url.searchParams));
  if (!q.success) {
    return NextResponse.json({ ok: false, error: "Invalid query." }, { status: 400 });
  }

  const [receipts, total] = await prisma.$transaction([
    prisma.accountingReceipt.findMany({
      orderBy: { createdAt: "desc" },
      take: q.data.take,
      skip: q.data.skip,
      select: {
        id: true,
        fileName: true,
        r2Key: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
        studioExpenseId: true,
      },
    }),
    prisma.accountingReceipt.count(),
  ]);

  return NextResponse.json({ ok: true, receipts, total, hasMore: q.data.skip + receipts.length < total });
}
