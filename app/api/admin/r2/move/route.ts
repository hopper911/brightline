import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { assertSameOriginAdminMutation } from "@/lib/admin-request-origin";
import {
  assertR2ManagerKeyAllowed,
  cleanR2Key,
  fileNameFromKey,
  invalidateReferencedR2KeyCache,
  normalizePrefix,
  parentPrefixFromKey,
  rewriteR2KeyReferences,
} from "@/lib/admin-r2-manager";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { moveObject } from "@/lib/storage-r2";
import { normalizeR2VaultId } from "@/lib/r2-vaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MoveItem = { from: string; to: string };

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const originDenied = assertSameOriginAdminMutation(req);
  if (originDenied) return originDenied;
  if (await isRateLimitedAsync(getClientIp(req), { scope: "r2-move", max: 80, windowMs: 60 * 60_000 })) {
    return NextResponse.json({ ok: false, error: "Too many move requests." }, { status: 429 });
  }

  let body: {
    items?: MoveItem[];
    /** Move keys into destinationPrefix keeping filenames */
    keys?: string[];
    destinationPrefix?: string;
    vault?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const vault = normalizeR2VaultId(body.vault);

  const items: MoveItem[] = [];
  if (Array.isArray(body.items) && body.items.length) {
    for (const item of body.items) {
      if (!item?.from || !item?.to) continue;
      items.push({ from: cleanR2Key(item.from), to: cleanR2Key(item.to) });
    }
  } else if (Array.isArray(body.keys) && body.destinationPrefix) {
    const dest = normalizePrefix(body.destinationPrefix);
    for (const key of body.keys) {
      const from = cleanR2Key(key);
      if (!from) continue;
      items.push({ from, to: `${dest}${fileNameFromKey(from)}` });
    }
  }

  if (!items.length) {
    return NextResponse.json(
      { ok: false, error: "Provide items[{from,to}] or keys + destinationPrefix." },
      { status: 400 }
    );
  }

  if (items.length > 200) {
    return NextResponse.json({ ok: false, error: "Max 200 moves per request." }, { status: 400 });
  }

  try {
    for (const item of items) {
      assertR2ManagerKeyAllowed(item.from, vault);
      assertR2ManagerKeyAllowed(item.to, vault);
      if (parentPrefixFromKey(item.to) === item.to) {
        throw Object.assign(new Error("Destination must be a file key, not a folder."), {
          status: 400,
        });
      }
    }

    const results: Array<{ from: string; to: string; dbUpdates: number; error?: string }> = [];
    for (const item of items) {
      try {
        await moveObject(item.from, item.to, vault);
        const dbUpdates =
          vault === "brightline" ? await rewriteR2KeyReferences(item.from, item.to) : 0;
        results.push({ from: item.from, to: item.to, dbUpdates });
      } catch (err) {
        results.push({
          from: item.from,
          to: item.to,
          dbUpdates: 0,
          error: err instanceof Error ? err.message : "Move failed",
        });
      }
    }

    if (vault === "brightline") invalidateReferencedR2KeyCache();
    const failed = results.filter((r) => r.error);
    return NextResponse.json({
      ok: failed.length === 0,
      results,
      moved: results.filter((r) => !r.error).length,
      failed: failed.length,
      vault,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Move failed.";
    const status =
      typeof err === "object" && err && "status" in err && typeof (err as { status: number }).status === "number"
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
