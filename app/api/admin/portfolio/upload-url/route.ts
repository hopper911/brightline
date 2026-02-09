import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getMarketingUploadUrl } from "@/lib/image-strategy";
import { hasAdminAccess } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const isAdmin = await hasAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await req.json()) as {
      filename?: string;
      contentType?: string;
    };

    if (!body.filename) {
      return NextResponse.json(
        { error: "Filename required." },
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

    return NextResponse.json({ url: signed.url });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "Unable to create upload URL." },
      { status: 500 }
    );
  }
}
