import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { assertSameOriginAdminMutation } from "@/lib/admin-request-origin";
import { parseGoogleReviewScreenshot } from "@/lib/ai/parseGoogleReviewScreenshot";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const originDenied = assertSameOriginAdminMutation(req);
  if (originDenied) return originDenied;

  const ip = getClientIp(req);
  if (await isRateLimitedAsync(ip, { scope: "google-import-screenshot", max: 20, windowMs: 60 * 60_000 })) {
    return NextResponse.json(
      { ok: false, error: "Too many screenshot parses. Try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const row = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const imageUrl = typeof row.imageUrl === "string" ? row.imageUrl.trim() : "";
  if (!imageUrl) {
    return NextResponse.json({ ok: false, error: "imageUrl is required." }, { status: 400 });
  }

  try {
    const origin = new URL(req.url).origin;
    const parsed = await parseGoogleReviewScreenshot(imageUrl, origin);
    return NextResponse.json({ ok: true, parsed });
  } catch (err: unknown) {
    console.error("GOOGLE_REVIEW_SCREENSHOT_PARSE_ERROR", err);
    const status =
      err && typeof err === "object" && "status" in err && typeof (err as { status: unknown }).status === "number"
        ? (err as { status: number }).status
        : 502;
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Failed to parse screenshot.",
      },
      { status: status >= 400 && status < 600 ? status : 502 }
    );
  }
}
