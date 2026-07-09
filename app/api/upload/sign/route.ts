import { NextResponse } from "next/server";
import { signPut } from "@/lib/storage-r2";
import { getAdminSession } from "@/lib/admin-auth";
import { isAdminSignableMediaKey } from "@/lib/media-key-access";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  const body = (await req.json()) as {
    key?: string;
    contentType?: string;
    expiresIn?: number;
  };

  if (!body.key) {
    return NextResponse.json(
      { ok: false, error: "Missing key." },
      { status: 400 }
    );
  }

  const key = body.key.trim().replace(/^\/+/, "");
  if (!isAdminSignableMediaKey(key)) {
    return NextResponse.json(
      { ok: false, error: "Unsupported media key prefix." },
      { status: 400 }
    );
  }

  try {
    const signed = await signPut({
      key,
      contentType: body.contentType,
      expiresIn: body.expiresIn,
    });
    return NextResponse.json({ ok: true, url: signed.url, headers: signed.headers, expiresIn: signed.expiresIn });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to sign." },
      { status: 500 }
    );
  }
}
