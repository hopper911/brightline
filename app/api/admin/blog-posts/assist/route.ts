import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr, parseJsonBody } from "@/lib/api/http";
import { generateBlogPostAssist, parseBlogAssistInput } from "@/lib/ai/generateBlogPostAssist";
import { safeAiClientError } from "@/lib/ai/safe-client-error";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  const ip = getClientIp(req);
  if (
    await isRateLimitedAsync(ip, {
      scope: "ai-blog-assist",
      max: 40,
      windowMs: 60 * 60_000,
    })
  ) {
    return jsonErr("Too many AI requests. Try again shortly.", 429);
  }

  const raw = await parseJsonBody(req);
  if (!raw.ok) return raw.response;

  const parsed = parseBlogAssistInput(raw.value);
  if (!parsed.ok) {
    return jsonErr(parsed.error, parsed.status);
  }

  try {
    const result = await generateBlogPostAssist(parsed.data.action, parsed.data.draft);
    return NextResponse.json({ ok: true, action: parsed.data.action, result });
  } catch (err: unknown) {
    console.error("BLOG_ASSIST_ERROR", err);
    const safe = safeAiClientError(err, "AI assist failed.");
    return jsonErr(safe.error, safe.status);
  }
}
