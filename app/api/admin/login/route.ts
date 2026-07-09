import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ADMIN_ACCESS_COOKIE } from "@/lib/admin-cookie";
import { ADMIN_SESSION_MAX_AGE_SEC, createAdminSessionToken } from "@/lib/admin-session";
import { getClientIp, isRateLimited } from "@/lib/permissions/rate-limit";
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

function timingSafeMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (isRateLimited(ip, { scope: "admin-login", max: 8, windowMs: 15 * 60_000 })) {
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

  if (!timingSafeMatch(provided, expected)) {
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
