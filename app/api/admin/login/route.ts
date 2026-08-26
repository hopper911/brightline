import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ADMIN_ACCESS_COOKIE } from "@/lib/admin-cookie";
import { ADMIN_SESSION_MAX_AGE_SEC, createAdminSessionToken } from "@/lib/admin-session";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { resolveAdminAccessCode } from "@/lib/resolve-admin-access-code";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * `Secure` cookies are not stored over HTTP. Production on Vercel is always HTTPS;
 * a local `next start` smoke test is often HTTP — use x-forwarded-proto / URL when present.
 */
function cookieSecure(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  const forwarded = req.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() === "https";
  }
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}

/** Constant-time compare via SHA-256 digests (avoids length oracle on raw strings). */
function timingSafeMatch(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (
    (await isRateLimitedAsync(ip, { scope: "admin-login", max: 8, windowMs: 15 * 60_000 })) ||
    (await isRateLimitedAsync(ip, { scope: "admin-login-burst", max: 3, windowMs: 60_000 }))
  ) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let body: { code?: string };
  try {
    body = (await req.json()) as { code?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const expected = resolveAdminAccessCode()?.trim();
  const provided = typeof body.code === "string" ? body.code.trim() : "";

  if (!expected) {
    const isVercel = process.env.VERCEL === "1";
    return NextResponse.json(
      {
        ok: false,
        error: isVercel
          ? "Admin login is not configured. Add ADMIN_ACCESS_CODE under Vercel → Project → Settings → Environment Variables, then redeploy."
          : "Admin login is not configured (set ADMIN_ACCESS_CODE in .env.local).",
      },
      { status: 503 }
    );
  }

  const ok = timingSafeMatch(provided, expected);
  if (!ok) {
    await new Promise((r) => setTimeout(r, 250 + Math.floor(Math.random() * 200)));
    return NextResponse.json({ ok: false, error: "Invalid code." }, { status: 401 });
  }

  const sessionToken = createAdminSessionToken();
  if (!sessionToken) {
    return NextResponse.json(
      { ok: false, error: "Admin session signing is not configured." },
      { status: 503 }
    );
  }

  const res = NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
  res.cookies.set(ADMIN_ACCESS_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(req),
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SEC,
  });
  return res;
}
