import { NextResponse } from "next/server";
import { guardAdminJson } from "@/lib/api/guards";
import { jsonErr } from "@/lib/api/http";
import { isPrivateMediaKey, isPublicMediaKey } from "@/lib/media-key-access";
import { signGet } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = await guardAdminJson(req);
  if (denied) return denied;

  let body: { key?: string; expiresIn?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonErr("Invalid JSON body.", 400);
  }

  const key = body.key?.trim().replace(/^\/+/, "") ?? "";
  if (!key) {
    return jsonErr("Missing key.", 400);
  }
  if (!isPrivateMediaKey(key) && !isPublicMediaKey(key)) {
    return jsonErr("Unsupported media key prefix.", 400);
  }

  try {
    const signed = await signGet({
      key,
      expiresIn: body.expiresIn,
    });
    return NextResponse.json({ ok: true, url: signed.url, expiresIn: signed.expiresIn });
  } catch (error) {
    return jsonErr(error instanceof Error ? error.message : "Unable to sign.", 500);
  }
}
