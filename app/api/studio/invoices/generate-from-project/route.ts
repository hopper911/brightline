import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { asNullableString } from "@/lib/studio/finance";
import { generateInvoiceFromProject } from "@/lib/studio/invoicing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const projectId = asNullableString(body.projectId);
  if (!projectId) {
    return NextResponse.json({ ok: false, error: "projectId is required." }, { status: 400 });
  }

  try {
    const invoice = await generateInvoiceFromProject(projectId);
    return NextResponse.json({ ok: true, invoice });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed.";
    const status = message.includes("not found") || message.includes("no client") ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
