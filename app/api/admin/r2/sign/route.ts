import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { assertR2ManagerKeyAllowed } from "@/lib/admin-r2-manager";
import { normalizeR2VaultId } from "@/lib/r2-vaults";
import { signGet } from "@/lib/storage-r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin signed GET redirect for R2 manager previews (any vault). */
export async function GET(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get("key")?.trim() ?? "";
  const vault = normalizeR2VaultId(url.searchParams.get("vault"));
  if (!key) {
    return NextResponse.json({ ok: false, error: "key is required." }, { status: 400 });
  }

  try {
    assertR2ManagerKeyAllowed(key, vault);
    const signed = await signGet({ key, vault, expiresIn: 900 });
    return NextResponse.redirect(signed.url, 302);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sign failed.";
    const status =
      typeof err === "object" &&
      err &&
      "status" in err &&
      typeof (err as { status: number }).status === "number"
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
