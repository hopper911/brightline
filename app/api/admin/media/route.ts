import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { listMediaLibrary } from "@/lib/admin-media-library";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const isAdmin = await authorizeAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const url = new URL(req.url);
    const sourceParam = url.searchParams.get("source")?.trim().toLowerCase();
    const source =
      sourceParam === "brightline" || sourceParam === "mirotech" || sourceParam === "all"
        ? sourceParam
        : "all";

    const { items, projects } = await listMediaLibrary({
      source,
      sectionSlug: url.searchParams.get("section")?.trim() || undefined,
      type: url.searchParams.get("type")?.trim() || undefined,
      projectId: url.searchParams.get("projectId")?.trim() || undefined,
      search: url.searchParams.get("search")?.trim() || undefined,
    });

    return NextResponse.json({
      ok: true,
      items,
      projects,
    });
  } catch (err: unknown) {
    console.error("ADMIN_MEDIA_GET_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to load media.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
