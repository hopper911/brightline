import { NextResponse } from "next/server";
import { isAllowedPublicMediaKey } from "@/lib/media-key-access";
import { signPublicR2Get } from "@/lib/storage-r2-public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key")?.trim().replace(/^\/+/, "") || "";
  if (!key || !isAllowedPublicMediaKey(key)) {
    return NextResponse.json({ ok: false, error: "Invalid media key." }, { status: 400 });
  }

  let signed: { url: string };
  try {
    signed = await signPublicR2Get({ key, expiresIn: 300 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Storage error";
    console.error("MEDIA_PUBLIC_SIGN_ERROR", msg);
    return NextResponse.json(
      { ok: false, error: "Media temporarily unavailable." },
      { status: 503 }
    );
  }

  // Same-origin bytes so `<img crossOrigin="anonymous">` + canvas export works (302 to R2/CDN breaks CORS).
  if (url.searchParams.get("proxy") === "1") {
    let upstream: Response;
    try {
      upstream = await fetch(signed.url, { redirect: "follow" });
    } catch (err) {
      console.error("MEDIA_PUBLIC_PROXY_FETCH_ERROR", err);
      return NextResponse.json(
        { ok: false, error: "Media temporarily unavailable." },
        { status: 502 }
      );
    }
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { ok: false, error: "Media temporarily unavailable." },
        { status: upstream.status >= 400 ? upstream.status : 502 }
      );
    }
    const contentType =
      upstream.headers.get("content-type") ?? "application/octet-stream";
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=120",
      },
    });
  }

  const res = NextResponse.redirect(signed.url, { status: 302 });
  res.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=300");
  return res;
}
