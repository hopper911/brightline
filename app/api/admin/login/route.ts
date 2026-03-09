import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as { code?: string };
  const expected = process.env.ADMIN_ACCESS_CODE;

  if (!expected || body.code !== expected) {
    return NextResponse.json({ ok: false, error: "Invalid code." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_access", "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
