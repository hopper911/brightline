import { NextResponse } from "next/server";
import { signGet } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_PREFIXES = [
  "portfolio/",
  "portfolio-public/",
  "work/",
  "studio/",
  "site/",
  "client-galleries/",
];

function isAllowedKey(key: string) {
  const clean = key.replace(/^\/+/, "");
  return ALLOWED_PREFIXES.some((prefix) => clean.startsWith(prefix));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key")?.trim().replace(/^\/+/, "") || "";
  if (!key || !isAllowedKey(key)) {
    return NextResponse.json({ ok: false, error: "Invalid media key." }, { status: 400 });
  }

  const signed = await signGet({ key, expiresIn: 300 });
  const res = NextResponse.redirect(signed.url, { status: 302 });
  res.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=300");
  return res;
}
