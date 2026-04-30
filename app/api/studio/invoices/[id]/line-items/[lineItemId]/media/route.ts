import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { attachMediaToLineItem } from "@/lib/studio/invoicing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string; lineItemId: string }> }
) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { lineItemId } = await context.params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const link = await attachMediaToLineItem({
      lineItemId,
      studioMediaId: typeof body.studioMediaId === "string" ? body.studioMediaId : null,
      galleryImageId: typeof body.galleryImageId === "string" ? body.galleryImageId : null,
      quantity: body.quantity,
    });
    return NextResponse.json({ ok: true, link });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Link failed.";
    const status =
      message.includes("Unique constraint") || message.includes("Unique ")
        ? 409
        : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
