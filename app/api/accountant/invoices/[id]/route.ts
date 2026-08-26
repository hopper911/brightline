import { NextResponse } from "next/server";
import { assertPermission, auditAccountantAction, getAccountantPortalContextFromRequest } from "@/lib/accountant/auth";
import { prisma } from "@/lib/prisma";

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
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      issuedAt: true,
      dueAt: true,
      sentAt: true,
      paidAt: true,
      currency: true,
      subtotal: true,
      tax: true,
      discount: true,
      total: true,
      amountPaid: true,
      balanceRemaining: true,
      paymentInstructions: true,
      pdfStorageKey: true,
      client: { select: { id: true, companyName: true } },
      project: {
        select: portal.permissions.canViewProjectFinancials
          ? {
              id: true,
              title: true,
              client: true,
              totalPrice: true,
              amountPaid: true,
              balanceRemaining: true,
            }
          : { id: true, title: true, client: true },
      },
      lineItems: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          type: true,
          unitLabel: true,
          unitPrice: true,
          quantity: true,
          amount: true,
        },
      },
      payments: {
        orderBy: { date: "desc" },
        select: {
          id: true,
          amount: true,
          date: true,
          type: true,
          note: true,
          recordStatus: true,
          paymentMethod: true,
        },
      },
      accountingNotes: {
        orderBy: { createdAt: "desc" },
        take: 80,
        select: {
          id: true,
          body: true,
          createdAt: true,
          authorType: true,
          isOwnerActor: true,
        },
      },
    },
  });

  if (!inv) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  await auditAccountantAction({
    ctx: portal,
    action: "accountant.invoice.view",
    entityType: "StudioInvoice",
    entityId: inv.id,
    req,
  });

  return NextResponse.json({ ok: true, invoice: inv });
}
