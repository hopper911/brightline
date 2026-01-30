import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getMarketingPublicUrl, getMarketingUploadUrl } from "@/lib/image-strategy";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      filename?: string;
      contentType?: string;
      categorySlug?: string;
      projectSlug?: string;
    };

    if (!body.filename || !body.categorySlug || !body.projectSlug) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const key = `portfolio/${body.categorySlug}/${body.projectSlug}/${Date.now()}-${body.filename}`;
    const signed = await getMarketingUploadUrl({
      key,
      contentType: body.contentType,
    });

    const publicUrl = getMarketingPublicUrl(key);

    return NextResponse.json({ url: signed.url, publicUrl, key });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
}
