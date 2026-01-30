import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getMarketingUploadUrl } from "@/lib/image-strategy";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
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

    const signed = await getMarketingUploadUrl({
      key,
      contentType: body.contentType || "image/jpeg",
    });

    return NextResponse.json({ ok: true, ...signed });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { ok: false, error: "Unable to create upload URL." },
      { status: 500 }
    );
  }
}
