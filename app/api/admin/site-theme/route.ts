import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getSiteTheme, saveSiteTheme } from "@/lib/site-theme";
import { revalidatePublicChrome } from "@/lib/revalidate-public-chrome";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const theme = await getSiteTheme();
  return NextResponse.json({ ok: true, theme });
}

export async function PATCH(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const theme = await saveSiteTheme(
    body && typeof body === "object" && "theme" in body
      ? (body as { theme: unknown }).theme
      : body
  );
  revalidatePublicChrome();
  return NextResponse.json({ ok: true, theme });
}
