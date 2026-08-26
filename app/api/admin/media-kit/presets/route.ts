import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr, parseJsonBody } from "@/lib/api/http";
import {
  DEFAULT_MEDIA_KIT_PRESETS,
  getMediaKitPresets,
  saveMediaKitPresets,
} from "@/lib/media-kit/presets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;
  const presets = await getMediaKitPresets();
  return NextResponse.json({ ok: true, presets, defaults: DEFAULT_MEDIA_KIT_PRESETS });
}

export async function PUT(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;
  const raw = await parseJsonBody(req);
  if (!raw.ok) return raw.response;
  const body = raw.value as Record<string, unknown>;
  try {
    const presets = await saveMediaKitPresets(body.presets);
    return NextResponse.json({ ok: true, presets });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save presets.";
    return jsonErr(message, 500);
  }
}
