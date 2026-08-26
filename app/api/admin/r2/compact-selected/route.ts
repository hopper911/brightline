import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { rejectCrossSiteMutation } from "@/lib/admin-request-origin";
import { compactExistingKey } from "@/lib/admin-r2-compact";
import { assertR2ManagerKeyAllowed, detectR2Kind } from "@/lib/admin-r2-manager";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { normalizeR2VaultId } from "@/lib/r2-vaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const csrf = rejectCrossSiteMutation(req);
  if (csrf) return csrf;
  if (
    await isRateLimitedAsync(getClientIp(req), {
      scope: "r2-compact-selected",
      max: 20,
      windowMs: 60 * 60_000,
    })
  ) {
    return NextResponse.json({ ok: false, error: "Too many compact requests." }, { status: 429 });
  }

  let body: { keys?: string[]; vault?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  if (normalizeR2VaultId(body.vault) === "mirotech-site") {
    return NextResponse.json(
      {
        ok: false,
        error: "Compact-to-WebP is only available on the Brightline vault.",
      },
      { status: 400 }
    );
  }

  const keys = [...new Set((body.keys ?? []).map((k) => k.trim()).filter(Boolean))].slice(0, 20);
  if (!keys.length) {
    return NextResponse.json({ ok: false, error: "keys required." }, { status: 400 });
  }

  const results: Array<{ from: string; fullKey?: string; thumbKey?: string; error?: string }> = [];
  for (const key of keys) {
    try {
      assertR2ManagerKeyAllowed(key);
      if (detectR2Kind(key) !== "image") {
        results.push({ from: key, error: "Only images can be compacted." });
        continue;
      }
      const stored = await compactExistingKey(key);
      results.push({ from: key, fullKey: stored.fullKey, thumbKey: stored.thumbKey });
    } catch (err) {
      results.push({
        from: key,
        error: err instanceof Error ? err.message : "Compact failed.",
      });
    }
  }

  const failed = results.filter((r) => r.error);
  return NextResponse.json({
    ok: failed.length === 0,
    compacted: results.filter((r) => !r.error).length,
    failed: failed.length,
    results,
  });
}
