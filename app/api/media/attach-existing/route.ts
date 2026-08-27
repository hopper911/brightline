import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isAllowedAttachKey,
  normalizeAttachKey,
  resolveAttachStorageValue,
} from "@/lib/attach-existing-keys";
import { requireProjectsApiAuth } from "@/lib/api/automation-auth";
import { isR2VaultId, type R2VaultId } from "@/lib/r2-vaults-shared";
import { mirotechSitePublicObjectUrl } from "@/lib/r2-vaults";
import { attachMediaToStudioProject } from "@/lib/studio/studio-project-cms";

export const runtime = "nodejs";

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

type AttachItem = { key: string; vault: R2VaultId };

function parseAttachItems(body: {
  keys?: unknown;
  items?: unknown;
}): AttachItem[] {
  if (Array.isArray(body.items)) {
    const out: AttachItem[] = [];
    for (const row of body.items) {
      if (!row || typeof row !== "object") continue;
      const rec = row as Record<string, unknown>;
      const key = typeof rec.key === "string" ? normalizeAttachKey(rec.key) : "";
      if (!key) continue;
      const vault: R2VaultId = isR2VaultId(rec.vault) ? rec.vault : "brightline";
      out.push({ key, vault });
    }
    if (out.length > 0) return out;
  }

  if (!Array.isArray(body.keys)) return [];
  return body.keys
    .map((k) => String(k).trim())
    .filter(Boolean)
    .map((key) => ({ key: normalizeAttachKey(key), vault: "brightline" as const }));
}

export async function POST(req: Request) {
  const auth = await requireProjectsApiAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  let body: { studioProjectId?: string; keys?: string[]; items?: AttachItem[]; setFirstAsHero?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const studioProjectId = body.studioProjectId?.trim() ?? "";
  const items = parseAttachItems(body);

  if (!studioProjectId || items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "studioProjectId and a non-empty keys/items array are required." },
      { status: 400 }
    );
  }

  const studio = await prisma.studioProject.findUnique({ where: { id: studioProjectId } });
  if (!studio) {
    return NextResponse.json({ ok: false, error: "Studio project not found." }, { status: 404 });
  }

  for (const item of items) {
    if (!isAllowedAttachKey(item.key, item.vault)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Storage key not allowed for vault ${item.vault}: ${item.key}`,
        },
        { status: 400 }
      );
    }
  }

  const setFirstAsHero = Boolean(body.setFirstAsHero);
  const title = studio.title;

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    let keyFull: string;
    if (item.vault === "mirotech-site") {
      const pub = mirotechSitePublicObjectUrl(item.key);
      keyFull = pub ?? resolveAttachStorageValue(item.key, item.vault, null);
    } else {
      keyFull = resolveAttachStorageValue(item.key, item.vault, null);
    }
    const isVideo = VIDEO_EXT.test(item.key);
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
