import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getAdminNav, saveAdminNavGroups } from "@/lib/admin-nav";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request) {
  const isAdmin = await authorizeAdminRequest(_req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const groups = await getAdminNav();
  return NextResponse.json({ ok: true, groups });
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

  const payload =
    body && typeof body === "object" && "groups" in body ? (body as { groups: unknown }).groups : body;
  const groups = await saveAdminNavGroups(payload);
  revalidatePath("/admin", "layout");
  return NextResponse.json({ ok: true, groups });
}
