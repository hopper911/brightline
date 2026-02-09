import { NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/admin-auth";
import { getPublicUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await req.json()) as { key?: string };
  if (!body.key) {
    return NextResponse.json({ error: "Key required." }, { status: 400 });
  }

  const url = getPublicUrl(body.key);
  return NextResponse.json({ url });
}
