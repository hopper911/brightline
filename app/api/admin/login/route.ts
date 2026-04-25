import { NextResponse } from "next/server";
import { resolveAdminAccessCode } from "@/lib/resolve-admin-access-code";

export const runtime = "nodejs";

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

export async function POST(req: Request) {
  const body = (await req.json()) as { code?: string };
  const expected = resolveAdminAccessCode()?.trim();
  const provided = typeof body.code === "string" ? body.code.trim() : "";

  if (!expected) {
    return NextResponse.json(
      {
        ok: false,
        error: "Admin login is not configured (set ADMIN_ACCESS_CODE in .env.local).",
      },
      { status: 503 }
    );
  }

  if (provided !== expected) {
    return NextResponse.json({ ok: false, error: "Invalid code." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_access", "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
