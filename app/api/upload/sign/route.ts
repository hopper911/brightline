import { NextResponse } from "next/server";
import { signPut } from "@/lib/storage-r2";
import { getAdminSession } from "@/lib/admin-auth";

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

  try {
    const signed = await signPut({
      key: body.key,
      contentType: body.contentType,
      expiresIn: body.expiresIn,
    });
    return NextResponse.json({ ok: true, url: signed.url, expiresIn: signed.expiresIn });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to sign." },
      { status: 500 }
    );
  }
}
