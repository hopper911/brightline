import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { createProjectFromTemplate } from "@/lib/project-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const body = await req.json().catch(() => null) as { templateId?: unknown; title?: unknown; slug?: unknown } | null;
  const templateId = typeof body?.templateId === "string" ? body.templateId.trim() : "";
  if (!templateId) {
    return NextResponse.json({ ok: false, error: "templateId is required." }, { status: 400 });
  }

  try {
    const result = await createProjectFromTemplate({
      templateId,
      title: typeof body?.title === "string" ? body.title : undefined,
      slug: typeof body?.slug === "string" ? body.slug : undefined,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to create project from template." },
      { status: 400 }
    );
  }
}

