import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { cleanText } from "@/lib/delivery/package";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ packageId: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { packageId } = await context.params;
  let body: { invoiceId?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const invoiceId = cleanText(body.invoiceId);
  if (!invoiceId) return NextResponse.json({ ok: false, error: "invoiceId is required." }, { status: 400 });
  const invoice = await prisma.studioInvoice.update({
    where: { id: invoiceId },
    data: { deliveryPackageId: packageId },
    include: { lineItems: true, client: true },
  });
  return NextResponse.json({ ok: true, invoice });
}

