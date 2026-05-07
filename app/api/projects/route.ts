import { NextResponse } from "next/server";
import { guardProjectsApiJson } from "@/lib/api/guards";
import { listStudioProjectsForAdmin } from "@/lib/studio/studio-project-cms";
import { apiLog } from "@/lib/observability/log";

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
 * Query: `category` (substring match), `published` (`true` | `false` | omit for all), `limit`, `offset`
 */
export async function GET(req: Request) {
  const denied = await guardProjectsApiJson(req);
  if (denied) return denied;

  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category") ?? undefined;
    const pub = url.searchParams.get("published");
    let published: boolean | null | undefined;
    if (pub === "true") published = true;
    else if (pub === "false") published = false;

    const limitRaw = url.searchParams.get("limit");
    const offsetRaw = url.searchParams.get("offset");
    const limit = limitRaw != null ? Number(limitRaw) : undefined;
    const offset = offsetRaw != null ? Number(offsetRaw) : undefined;

    const { rows, hasMore } = await listStudioProjectsForAdmin({
      category,
      published,
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
    apiLog("api.projects.list", "info", "ok", {
      count: rows.length,
      hasMore,
    });
    return jsonNoStore({ ok: true, projects: rows, hasMore });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to list projects.";
    apiLog("api.projects.list", "error", "failed", { message: msg });
    return jsonNoStore({ ok: false, error: msg }, { status: 500 });
  }
}
