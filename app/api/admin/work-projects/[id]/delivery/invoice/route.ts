import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { generateInvoiceFromProject, recalculateInvoiceFinance } from "@/lib/studio/invoicing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  const project = await prisma.workProject.findUnique({ where: { id }, select: { studioProjectId: true } });
  if (!project?.studioProjectId) {
    return NextResponse.json(
      { ok: false, error: "Link this Work project to a Studio OS project before creating an invoice." },
      { status: 400 }
    );
  }

  try {
    const invoice = await generateInvoiceFromProject(project.studioProjectId);
    await prisma.workProject.update({ where: { id }, data: { attachedInvoiceId: invoice.id } });
    return NextResponse.json({ ok: true, invoice });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create invoice.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await context.params;
  let body: { invoiceId?: string | null; action?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const invoiceId = body.invoiceId?.trim() || null;
  if (body.action === "mark_paid") {
    const project = await prisma.workProject.findUnique({ where: { id }, select: { attachedInvoiceId: true } });
    const targetId = invoiceId ?? project?.attachedInvoiceId;
    if (!targetId) return NextResponse.json({ ok: false, error: "No invoice attached." }, { status: 400 });
    const invoice = await prisma.$transaction(async (tx) => {
      await tx.studioInvoice.update({ where: { id: targetId }, data: { status: "PAID", paidAt: new Date() } });
      return recalculateInvoiceFinance(tx, targetId, "PAID");
    });
    return NextResponse.json({ ok: true, invoice });
  }

  await prisma.workProject.update({ where: { id }, data: { attachedInvoiceId: invoiceId } });
  return NextResponse.json({ ok: true });
}

