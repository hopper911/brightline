import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { assertSameOriginAdminMutation } from "@/lib/admin-request-origin";
import {
  assertR2ManagerKeyAllowed,
  cleanR2Key,
  invalidateReferencedR2KeyCache,
  rewriteR2KeyReferences,
} from "@/lib/admin-r2-manager";
import { rewriteMirotechCmsKeyReferences } from "@/lib/admin-r2-mirotech-cms-rewrite";
import { normalizeR2VaultId } from "@/lib/r2-vaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Rewrite CMS + DB references without moving R2 objects (duplicate merge). */
export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const originDenied = assertSameOriginAdminMutation(req);
  if (originDenied) return originDenied;

  let body: { from?: string; to?: string; vault?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const from = cleanR2Key(body.from ?? "");
  const to = cleanR2Key(body.to ?? "");
  const vault = normalizeR2VaultId(body.vault);
  if (!from || !to || from === to) {
    return NextResponse.json({ ok: false, error: "from and to keys required." }, { status: 400 });
  }

  try {
    assertR2ManagerKeyAllowed(from, vault);
    assertR2ManagerKeyAllowed(to, vault);
    const dbUpdates = vault === "brightline" ? await rewriteR2KeyReferences(from, to) : 0;
    const cmsResult = await rewriteMirotechCmsKeyReferences(from, to);
    if (vault === "brightline") invalidateReferencedR2KeyCache();
    return NextResponse.json({
      ok: true,
      from,
      to,
      dbUpdates,
      cmsUpdates: cmsResult.cmsUpdates,
      vault,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rewrite failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
