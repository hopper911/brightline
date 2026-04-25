import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getPublicR2Url } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAllowedSiteKey(key: string) {
  return /^site\/(pages|services|blocks|theme)\//.test(key);
}

export async function POST(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: { key?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const key = body.key?.trim() || "";
  if (!key || !isAllowedSiteKey(key)) {
    return NextResponse.json({ ok: false, error: "Invalid site media key." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, key, publicUrl: getPublicR2Url(key) });
}
