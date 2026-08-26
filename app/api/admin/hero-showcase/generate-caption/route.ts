import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr, parseJsonBody } from "@/lib/api/http";
import {
  generateShowcaseCaption,
  parseGenerateShowcaseCaptionInput,
} from "@/lib/ai/generateShowcaseCaption";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const ip = getClientIp(req);
  if (await isRateLimitedAsync(ip)) {
    return jsonErr("Too many caption requests. Try again shortly.", 429);
  }

  const raw = await parseJsonBody(req);
  if (!raw.ok) return raw.response;

  const parsed = parseGenerateShowcaseCaptionInput(raw.value);
  if (!parsed.ok) {
    return jsonErr(parsed.error, parsed.status);
  }

  try {
    const origin = new URL(req.url).origin;
    const result = await generateShowcaseCaption(parsed.data, origin);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    console.error("GENERATE_SHOWCASE_CAPTION_ERROR", err);
    const status =
      err && typeof err === "object" && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;
    const message = err instanceof Error ? err.message : "Failed to generate caption.";
    return jsonErr(message, status);
  }
}
