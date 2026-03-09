import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findAccessByCode } from "@/lib/client-access";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as { token?: string };
  const token = body.token?.trim();

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Access code is required." },
      { status: 400 }
    );
  }

  const access = await findAccessByCode(token);
  if (!access) {
    return NextResponse.json(
      { ok: false, error: "That access code is not valid." },
      { status: 404 }
    );
  }

  const jar = await cookies();
  jar.set("client_access", "true", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  jar.set("client_gallery", access.gallerySlug, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  jar.set("client_access_id", access.id, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({
    ok: true,
    galleryId: access.galleryId,
    slug: access.gallerySlug,
    url: `/client/${access.gallerySlug}`,
  });
}
