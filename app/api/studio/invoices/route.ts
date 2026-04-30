import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { asNullableString, parseDate } from "@/lib/studio/finance";
import { getNextInvoiceNumber, recalculateInvoiceFinance } from "@/lib/studio/invoicing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId")?.trim();
  const projectId = searchParams.get("projectId")?.trim();

  const invoices = await prisma.studioInvoice.findMany({
    where: {
      ...(clientId ? { clientId } : {}),
      ...(projectId ? { projectId } : {}),
    },
    orderBy: { invoiceNumber: "desc" },
    take: 200,
    include: {
      client: { select: { id: true, companyName: true } },
      project: { select: { id: true, title: true, slug: true } },
      _count: { select: { lineItems: true } },
    },
  });

  return NextResponse.json({ ok: true, invoices });
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const clientId = asNullableString(body.clientId);
  const projectId = asNullableString(body.projectId);

  let resolvedClientId = clientId;
  if (!resolvedClientId && projectId) {
    const proj = await prisma.studioProject.findUnique({
      where: { id: projectId },
      select: { clientId: true },
    });
    resolvedClientId = proj?.clientId ?? null;
  }

  if (!resolvedClientId) {
    return NextResponse.json(
      { ok: false, error: "clientId is required (or pass projectId with a linked client)." },
      { status: 400 }
    );
  }

  const notes = asNullableString(body.notes);
  const issuedAtRaw = body.issuedAt;
  const dueAtRaw = body.dueAt;

  try {
    const invoice = await prisma.$transaction(async (tx) => {
      const nextNo = await getNextInvoiceNumber(tx);
      const created = await tx.studioInvoice.create({
        data: {
          invoiceNumber: nextNo,
          clientId: resolvedClientId,
          projectId: projectId ?? undefined,
          notes: notes ?? undefined,
          issuedAt: issuedAtRaw != null && issuedAtRaw !== "" ? parseDate(issuedAtRaw) : undefined,
          dueAt: dueAtRaw != null && dueAtRaw !== "" ? parseDate(dueAtRaw) : undefined,
        },
      });
      return recalculateInvoiceFinance(tx, created.id);
    });
    return NextResponse.json({ ok: true, invoice });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create invoice.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
