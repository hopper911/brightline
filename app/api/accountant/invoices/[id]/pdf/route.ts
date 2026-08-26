import { NextResponse } from "next/server";
import { assertPermission, auditAccountantAction, getAccountantPortalContextFromRequest } from "@/lib/accountant/auth";
import { prisma } from "@/lib/prisma";
import { signGet } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const portal = await getAccountantPortalContextFromRequest(req);
  if (!portal) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  try {
    assertPermission(portal, "canViewInvoices");
  } catch (e: unknown) {
    const st = typeof e === "object" && e && "status" in e ? (e as { status: number }).status : 403;
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: st });
  }

  const { id } = await ctx.params;
  const inv = await prisma.studioInvoice.findUnique({
    where: { id },
    select: { id: true, pdfStorageKey: true },
  });
  if (!inv?.pdfStorageKey) {
    return NextResponse.json({ ok: false, error: "PDF not available." }, { status: 404 });
  }

  await auditAccountantAction({
    ctx: portal,
    action: "accountant.invoice.pdf",
    entityType: "StudioInvoice",
    entityId: inv.id,
    metadata: { key: inv.pdfStorageKey },
    req,
  });

  try {
    const { url } = await signGet({ key: inv.pdfStorageKey, expiresIn: 120 });
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ ok: false, error: "Storage not configured." }, { status: 500 });
  }
}
