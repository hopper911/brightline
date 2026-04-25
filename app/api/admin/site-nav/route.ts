import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getSiteNav, saveSiteNav } from "@/lib/site-nav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const nav = await getSiteNav();
  return NextResponse.json({ ok: true, nav });
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

  const nav = await saveSiteNav(
    body && typeof body === "object" && "nav" in body ? (body as { nav: unknown }).nav : body
  );
  return NextResponse.json({ ok: true, nav });
}
