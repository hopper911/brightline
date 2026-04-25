import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectsApiAuth } from "@/lib/api/automation-auth";
import { attachMediaToStudioProject } from "@/lib/studio/studio-project-cms";

export const runtime = "nodejs";

const VIDEO_EXT = /\.(mp4|webm)$/i;

function isAllowedKey(key: string): boolean {
  const k = key.replace(/^\/+/, "");
  return k.startsWith("portfolio/") || k.startsWith("work/") || k.startsWith("studio/");
}

export async function POST(req: Request) {
  const auth = await requireProjectsApiAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  let body: { studioProjectId?: string; keys?: string[]; setFirstAsHero?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const studioProjectId = body.studioProjectId?.trim() ?? "";
  const keys = Array.isArray(body.keys)
    ? body.keys.map((k) => String(k).trim()).filter(Boolean)
    : [];

  if (!studioProjectId || keys.length === 0) {
    return NextResponse.json(
      { ok: false, error: "studioProjectId and a non-empty keys array are required." },
      { status: 400 }
    );
  }

  const studio = await prisma.studioProject.findUnique({ where: { id: studioProjectId } });
  if (!studio) {
    return NextResponse.json({ ok: false, error: "Studio project not found." }, { status: 404 });
  }

  for (const key of keys) {
    if (!isAllowedKey(key)) {
      return NextResponse.json(
        { ok: false, error: `Storage key must start with portfolio/, work/, or studio/: ${key}` },
        { status: 400 }
      );
    }
  }

  const setFirstAsHero = Boolean(body.setFirstAsHero);
  const title = studio.title;

  for (let i = 0; i < keys.length; i++) {
    const keyFull = keys[i].replace(/^\/+/, "");
    const isVideo = VIDEO_EXT.test(keyFull);
    const kind = isVideo ? "VIDEO" : "IMAGE";
    const keyThumb = isVideo ? null : keyFull;
    const alt = `${title} – R2 ${String(i + 1).padStart(2, "0")}`;

    const media = await prisma.mediaAsset.create({
      data: {
        kind,
        keyFull,
        keyThumb,
        alt,
      },
    });

    const setAsHero = setFirstAsHero && i === 0;

    await attachMediaToStudioProject({
      studioProjectId,
      mediaId: media.id,
      keyFull,
      alt,
      setAsHero,
    });
  }

  return NextResponse.json({ ok: true });
}
