import { NextResponse } from "next/server";
import { getSignedUploadUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    filename?: string;
    contentType?: string;
  };

  if (!body.filename) {
    return NextResponse.json(
      { ok: false, error: "Filename required." },
      { status: 400 }
    );
  }

  const ext = body.filename.split(".").pop() || "jpg";
  const key = `portfolio-public/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  const signed = await getSignedUploadUrl({
    key,
    contentType: body.contentType || "image/jpeg",
    cacheControl: "public, max-age=31536000, immutable",
  });

  return NextResponse.json({ ok: true, ...signed });
}
