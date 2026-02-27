import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findAccessByCode } from "@/lib/client-access";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as { code?: string };
  const token = body.code?.trim();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing access code." },
      { status: 400 }
    );
  }

  const entry = await findAccessByCode(token);
  if (!entry) {
    return NextResponse.json(
      { ok: false, error: "Invalid access code." },
      { status: 401 }
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

  jar.set("client_gallery", entry.gallerySlug, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  jar.set("client_access_id", entry.id, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true, url: `/client/${entry.gallerySlug}` });
}
