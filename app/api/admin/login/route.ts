import { NextResponse } from "next/server";
import { resolveAdminAccessCode } from "@/lib/resolve-admin-access-code";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

export async function POST(req: Request) {
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

  if (provided !== expected) {
    return NextResponse.json({ ok: false, error: "Invalid code." }, { status: 401 });
  }

  const res = NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
  res.cookies.set("admin_access", "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
