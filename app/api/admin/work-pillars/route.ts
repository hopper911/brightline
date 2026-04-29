import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import type { PillarConfig } from "@/lib/portfolioPillars";
import { getWorkPillarList, saveWorkPillarList } from "@/lib/work-pillar-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const isAdmin = await authorizeAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }
    const pillars = await getWorkPillarList();
    return NextResponse.json({ ok: true, pillars });
  } catch (err: unknown) {
    console.error("WORK_PILLARS_GET", err);
    return NextResponse.json({ ok: false, error: "Failed to load." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
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
    const raw =
      body && typeof body === "object" && body && "pillars" in body
        ? (body as { pillars: unknown }).pillars
        : body;
    if (!Array.isArray(raw)) {
      return NextResponse.json({ ok: false, error: "Expected { pillars: [...] }." }, { status: 400 });
    }
    const pillars = raw as PillarConfig[];
    const saved = await saveWorkPillarList(pillars);
    revalidatePath("/", "layout");
    revalidatePath("/work");
    return NextResponse.json({ ok: true, pillars: saved });
  } catch (err: unknown) {
    console.error("WORK_PILLARS_PATCH", err);
    const message = err instanceof Error ? err.message : "Failed to save.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
