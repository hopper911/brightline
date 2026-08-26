import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { assertSameOriginAdminMutation } from "@/lib/admin-request-origin";
import { generateAltText, parseGenerateAltTextInput } from "@/lib/ai/generateAltText";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Delegates to `lib/ai/generateAltText` (vision + logging) for admin tooling. */
export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const originDenied = assertSameOriginAdminMutation(req);
  if (originDenied) return originDenied;
  if (
    await isRateLimitedAsync(getClientIp(req), {
      scope: "ai-alt-text",
      max: 60,
      windowMs: 60 * 60_000,
    })
  ) {
    return NextResponse.json({ ok: false, error: "Too many alt-text requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseGenerateAltTextInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }

  const origin = new URL(req.url).origin;

  try {
    const { altText } = await generateAltText(parsed.data, origin);
    return NextResponse.json({ ok: true, altText });
  } catch (e: unknown) {
    const status =
      typeof e === "object" && e && "status" in e && typeof (e as { status: number }).status === "number"
        ? (e as { status: number }).status
        : 500;
    const message = e instanceof Error ? e.message : "Alt text generation failed.";
    return NextResponse.json({ ok: false, error: message }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}
