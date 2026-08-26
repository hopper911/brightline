import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  assertR2ManagerKeyAllowed,
  cleanR2Key,
  collectReferencedR2KeysCached,
} from "@/lib/admin-r2-manager";
import { normalizeR2VaultId } from "@/lib/r2-vaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: { keys?: string[]; vault?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const vault = normalizeR2VaultId(body.vault);
  const keys = [...new Set((body.keys ?? []).map(cleanR2Key).filter(Boolean))].slice(0, 200);
  try {
    for (const key of keys) assertR2ManagerKeyAllowed(key, vault);
    if (vault !== "brightline") {
      const used: Record<string, boolean> = {};
      for (const key of keys) used[key] = false;
      return NextResponse.json({ ok: true, used, vault });
    }
    const referenced = await collectReferencedR2KeysCached();
    const used: Record<string, boolean> = {};
    for (const key of keys) used[key] = referenced.has(key);
    return NextResponse.json({ ok: true, used, vault });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Usage lookup failed.";
    const status =
      typeof err === "object" && err && "status" in err && typeof (err as { status: number }).status === "number"
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
