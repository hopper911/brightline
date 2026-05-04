import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signGet } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ accessToken: string }> }
) {
  const { accessToken } = await context.params;
  const pkg = await prisma.deliveryPackage.findUnique({
    where: { accessToken },
    include: { invoices: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!pkg || (pkg.expiresAt && pkg.expiresAt.getTime() < Date.now())) {
    return NextResponse.json({ ok: false, error: "Package not found." }, { status: 404 });
  }
  const invoice = pkg.invoices[0];
  if (!invoice?.pdfStorageKey) {
    return NextResponse.json({ ok: false, error: "Invoice PDF is not available." }, { status: 404 });
  }
  const h = await headers();
  await prisma.packageAccessLog.create({
    data: {
      deliveryPackageId: pkg.id,
      eventType: "invoice_downloaded",
      ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent"),
    },
  }).catch(() => null);
  if (invoice.status === "SENT") {
    await prisma.studioInvoice.update({ where: { id: invoice.id }, data: { status: "VIEWED" } }).catch(() => null);
  }
  const signed = await signGet({ key: invoice.pdfStorageKey, expiresIn: 300 });
  return NextResponse.redirect(signed.url);
}

