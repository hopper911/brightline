import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getClientDownloadUrl } from "@/lib/image-strategy";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as { key?: string; expiresIn?: number };
  if (!body.key) {
    return NextResponse.json(
      { ok: false, error: "Missing key." },
      { status: 400 }
    );
  }

  try {
    const signed = await getClientDownloadUrl({
      key: body.key,
      expiresIn: body.expiresIn,
    });
    return NextResponse.json({ ok: true, url: signed.url, expiresIn: signed.expiresIn });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to sign." },
      { status: 500 }
    );
  }
}
