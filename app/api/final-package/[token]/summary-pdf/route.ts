import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDeliverySummaryPdf } from "@/lib/delivery/package";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const project = await prisma.workProject.findUnique({
    where: { finalPackageToken: token },
    select: { id: true, slug: true },
  });
  if (!project) {
    return NextResponse.json({ ok: false, error: "Package not found." }, { status: 404 });
  }
  const buffer = await buildDeliverySummaryPdf(project.id);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${project.slug || "brightline"}-delivery-summary.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

