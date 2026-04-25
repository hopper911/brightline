import { NextResponse } from "next/server";
import { getHomepageFeaturedMedia } from "@/lib/queries/site";
import { getPublicR2Url } from "@/lib/r2";

export const runtime = "nodejs";

export async function GET() {
  try {
    const media = await getHomepageFeaturedMedia();
    if (!media) {
      return NextResponse.json({ ok: true, media: null });
    }
    return NextResponse.json({
      ok: true,
      media: {
        url: getPublicR2Url(media.displayKey),
        alt: media.alt ?? "Featured work",
      },
    });
  } catch (err: unknown) {
    console.error("HOMEPAGE_FEATURED_GET_ERROR", err);
    return NextResponse.json({ ok: false, error: "Failed to load." }, { status: 500 });
  }
}
