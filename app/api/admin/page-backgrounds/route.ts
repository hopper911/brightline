import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  getPageBackgroundMap,
  labelForPageBackgroundKey,
  normalizePageBackgroundKey,
  PAGE_BACKGROUND_HUBS,
  pathForPageBackgroundKey,
  savePageBackgroundMap,
  setPageBackgroundAssignment,
} from "@/lib/page-backgrounds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const map = await getPageBackgroundMap();
  const videoIds = [...new Set(Object.values(map))];
  const videos =
    videoIds.length === 0
      ? []
      : await prisma.siteBackgroundVideo.findMany({
          where: { id: { in: videoIds } },
          select: { id: true, title: true, enabled: true, isActive: true },
        });
  const byId = new Map(videos.map((v) => [v.id, v]));

  const assignments = Object.entries(map)
    .map(([pageKey, videoId]) => ({
      pageKey,
      label: labelForPageBackgroundKey(pageKey),
      path: pathForPageBackgroundKey(pageKey),
      videoId,
      videoTitle: byId.get(videoId)?.title ?? "(missing video)",
      videoEnabled: byId.get(videoId)?.enabled ?? false,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return NextResponse.json({
    ok: true,
    map,
    assignments,
    hubs: PAGE_BACKGROUND_HUBS,
  });
}

export async function PATCH(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: {
    pageKey?: string;
    videoId?: string | null;
    map?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  try {
    if (body.map !== undefined) {
      const map = await savePageBackgroundMap(body.map);
      return NextResponse.json({ ok: true, map });
    }

    const pageKey = normalizePageBackgroundKey(body.pageKey ?? "");
    if (!pageKey) {
      return NextResponse.json({ ok: false, error: "pageKey is required." }, { status: 400 });
    }

    const videoId =
      body.videoId === null || body.videoId === ""
        ? null
        : typeof body.videoId === "string"
          ? body.videoId.trim()
          : null;

    const map = await setPageBackgroundAssignment(pageKey, videoId);
    return NextResponse.json({ ok: true, map, pageKey, videoId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save assignment.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
