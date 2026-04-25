import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  getEditableServicePages,
  saveEditableServicePages,
} from "@/lib/service-pages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const services = await getEditableServicePages();
  return NextResponse.json({ ok: true, services });
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
    body && typeof body === "object" && Array.isArray((body as { services?: unknown }).services)
      ? (body as { services: unknown[] }).services
      : body;

  try {
    const services = await saveEditableServicePages(input);
    return NextResponse.json({ ok: true, services });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save services.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
