import { NextResponse } from "next/server";
import { requireProjectsApiAuth } from "@/lib/api/automation-auth";
import { listStudioProjectsForAdmin } from "@/lib/studio/studio-project-cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function jsonNoStore(body: unknown, init?: { status?: number }) {
  const res = NextResponse.json(body, init);
  res.headers.set("Cache-Control", "private, no-store, max-age=0");
  return res;
}

/**
 * List Studio CMS projects (admin / automation).
 * Query: `category` (substring match), `published` (`true` | `false` | omit for all)
 */
export async function GET(req: Request) {
  const auth = await requireProjectsApiAuth(req);
  if (!auth.ok) {
    return jsonNoStore({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category") ?? undefined;
    const pub = url.searchParams.get("published");
    let published: boolean | null | undefined;
    if (pub === "true") published = true;
    else if (pub === "false") published = false;

    const projects = await listStudioProjectsForAdmin({ category, published });
    return jsonNoStore({ ok: true, projects });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to list projects.";
    return jsonNoStore({ ok: false, error: msg }, { status: 500 });
  }
}
