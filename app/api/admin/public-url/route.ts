import { NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/admin-auth";
import { getPublicUrl } from "@/lib/storage";

export const runtime = "nodejs";

const ROUTE_NAME = "api/admin/public-url";

export async function POST(req: Request) {
  try {
    const isAdmin = await hasAdminAccess();
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    let body: { key?: string };
    try {
      body = (await req.json()) as { key?: string };
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    if (!body.key) {
      return NextResponse.json(
        { ok: false, error: "Key required." },
        { status: 400 }
      );
    }

    const url = getPublicUrl(body.key);
    return NextResponse.json({ ok: true, url });
  } catch (err: unknown) {
    console.error("PUBLIC_URL_ERROR", { route: ROUTE_NAME, err });
    const message =
      err instanceof Error ? err.message : "Unable to resolve public URL.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
