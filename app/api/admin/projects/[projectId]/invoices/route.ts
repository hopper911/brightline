import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getNextInvoiceNumber, recalculateInvoiceFinance } from "@/lib/studio/invoicing";
import { cleanText } from "@/lib/delivery/package";
import { parseDecimal, resolveStudioClientIdForWorkProject } from "@/lib/delivery/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { projectId } = await context.params;
  const workProject = await prisma.workProject.findUnique({ where: { id: projectId } });
  if (!workProject) return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const clientId = cleanText(body.clientId) ?? (await resolveStudioClientIdForWorkProject(projectId));
  if (!clientId) {
    return NextResponse.json(
      { ok: false, error: "Link this Work project to a Studio client/project or pass clientId before invoicing." },
      { status: 400 }
    );
  }
  const studioProjectId = workProject.studioProjectId;
  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.studioInvoice.create({
      data: {
        invoiceNumber: await getNextInvoiceNumber(tx),
        clientId,
        projectId: studioProjectId ?? undefined,
        deliveryPackageId: cleanText(body.deliveryPackageId),
        issuedAt: body.issueDate ? new Date(String(body.issueDate)) : new Date(),
        dueAt: body.dueDate ? new Date(String(body.dueDate)) : undefined,
        paymentInstructions: cleanText(body.paymentInstructions),
        notes: cleanText(body.notes),
        discount: parseDecimal(body.discount),
        tax: parseDecimal(body.tax),
      },
    });
    return recalculateInvoiceFinance(tx, created.id);
  });
  return NextResponse.json({ ok: true, invoice });
}

