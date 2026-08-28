import { NextResponse } from "next/server";
import { guardProjectsApiJson } from "@/lib/api/guards";
import { listStudioProjectsForAdmin } from "@/lib/studio/studio-project-cms";
import { platformLog } from "@/lib/observability/platform-log";

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
    platformLog({
      severity: "info",
      service: "platform",
      action: "api.projects.list",
      message: "ok",
      meta: {
        count: rows.length,
        hasMore,
      },
    });
    return jsonNoStore({ ok: true, projects: rows, hasMore });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to list projects.";
    platformLog({
      severity: "error",
      service: "platform",
      action: "api.projects.list",
      message: "failed",
      meta: { message: msg },
    });
    return jsonNoStore({ ok: false, error: msg }, { status: 500 });
  }
}
