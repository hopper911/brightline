import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getWebsitePages, saveWebsitePages } from "@/lib/website-pages";
import { revalidatePublicChrome } from "@/lib/revalidate-public-chrome";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const pages = await getWebsitePages();
  return NextResponse.json({ ok: true, pages });
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

  const input =
    body && typeof body === "object" && Array.isArray((body as { pages?: unknown }).pages)
      ? (body as { pages: unknown[] }).pages
      : body;

  const pages = await saveWebsitePages(input);
  revalidatePath("/", "layout");
  revalidatePublicChrome();
  return NextResponse.json({ ok: true, pages });
}
