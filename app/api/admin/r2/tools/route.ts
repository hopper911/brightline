import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { assertSameOriginAdminMutation } from "@/lib/admin-request-origin";
import {
  assertR2ManagerKeyAllowed,
  collectReferencedR2KeysCached,
  detectR2Kind,
  detectR2Quality,
  fileNameFromKey,
  formatBytes,
  normalizePrefix,
  pairKeyCandidate,
  previewUrlForKey,
  qualityLabel,
  rootsForVault,
} from "@/lib/admin-r2-manager";
import { groupDuplicateKeys, isHeavyObject } from "@/lib/admin-r2-hygiene";
import { rewriteMirotechCmsKeyReferencesBatch } from "@/lib/admin-r2-mirotech-cms-rewrite";
import { collectMirotechAllMedia } from "@/lib/admin-r2-mirotech-all-media";
import {
  buildMirotechDuplicateReport,
  buildMirotechReorgManifest,
  queryMirotechMediaAudit,
} from "@/lib/admin-r2-mirotech-audit";
import { collectBrightlineAllMedia } from "@/lib/admin-r2-brightline-all-media";
import type { UnifiedMediaKindFilter } from "@/lib/admin-r2-unified-media";
import { getClientIp, isRateLimitedAsync } from "@/lib/permissions/rate-limit";
import { listObjectsWithMeta } from "@/lib/storage-r2";
import { normalizeR2VaultId, resolveVaultForListPrefix, type R2VaultId } from "@/lib/r2-vaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOL_OPS = [
  "orphans",
  "pairs",
  "summary",
  "duplicates",
  "heavy",
  "videos",
  "mirotech-all-media",
  "brightline-all-media",
  "mirotech-media-audit",
  "mirotech-duplicate-report",
  "mirotech-reorg-manifest",
  "mirotech-cms-rewrite-batch",
] as const;

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const originDenied = assertSameOriginAdminMutation(req);
  if (originDenied) return originDenied;
  if (await isRateLimitedAsync(getClientIp(req), { scope: "r2-tools", max: 500, windowMs: 60 * 60_000 })) {
    return NextResponse.json({ ok: false, error: "Too many R2 tool requests." }, { status: 429 });
  }

  let body: {
    op?: string;
    prefix?: string;
    maxKeys?: number;
    vault?: string;
    kind?: string;
    offset?: number;
    limit?: number;
    search?: string;
    liveInCms?: boolean;
    orphan?: boolean;
    duplicate?: boolean;
    hasProposedMove?: boolean;
    pairs?: Array<{ from: string; to: string }>;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const vault = normalizeR2VaultId(body.vault);
  const op = (body.op ?? "").trim();
  if (!(TOOL_OPS as readonly string[]).includes(op)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "op required: orphans | pairs | summary | duplicates | heavy | videos | mirotech-all-media | brightline-all-media | mirotech-media-audit | mirotech-duplicate-report | mirotech-reorg-manifest",
      },
      { status: 400 }
    );
  }

  try {
    if (op === "summary") {
      const summary = [];
      for (const root of rootsForVault(vault)) {
        const flat = await listFlatWithSizes(root.prefix, 5000, vault);
        summary.push({
          id: root.id,
          label: root.label,
          prefix: root.prefix,
          objectCount: flat.count,
          bytes: flat.bytes,
          sizeLabel: formatBytes(flat.bytes),
          truncated: flat.truncated,
        });
      }
      return NextResponse.json({ ok: true, summary, vault });
    }

    if (op === "mirotech-all-media") {
      const maxKeys = Math.min(typeof body.maxKeys === "number" ? body.maxKeys : 5000, 8000);
      const kind = parseKindFilter(body.kind);
      const offset = typeof body.offset === "number" ? Math.max(0, body.offset) : 0;
      const limit = typeof body.limit === "number" ? Math.min(Math.max(1, body.limit), 500) : 200;
      const result = await collectMirotechAllMedia({ maxKeys, kind, offset, limit });
      return NextResponse.json({
        ok: true,
        objects: result.objects,
        scanned: result.scanned,
        truncated: result.truncated,
        cmsReferenced: result.cmsReferenced,
        dbReferenced: result.dbReferenced,
        bucketScanAdded: result.bucketScanAdded,
        kind,
        totalSorted: result.totalSorted,
        offset: result.offset,
        limit: result.limit,
        hasMore: result.hasMore,
      });
    }

    if (op === "mirotech-media-audit") {
      const maxKeys = Math.min(typeof body.maxKeys === "number" ? body.maxKeys : 8000, 8000);
      const kind = parseKindFilter(body.kind);
      const vaultRaw = (body.vault ?? "all").trim();
      const vault =
        vaultRaw === "mirotech-site" || vaultRaw === "brightline" ? vaultRaw : "all";
      const result = await queryMirotechMediaAudit({
        maxKeys,
        kind,
        offset: typeof body.offset === "number" ? body.offset : 0,
        limit: typeof body.limit === "number" ? body.limit : 120,
        filters: {
          kind,
          search: body.search,
          liveInCms: typeof body.liveInCms === "boolean" ? body.liveInCms : undefined,
          orphan: typeof body.orphan === "boolean" ? body.orphan : undefined,
          duplicate: typeof body.duplicate === "boolean" ? body.duplicate : undefined,
          hasProposedMove:
            typeof body.hasProposedMove === "boolean" ? body.hasProposedMove : undefined,
          vault,
        },
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (op === "mirotech-duplicate-report") {
      const report = await buildMirotechDuplicateReport();
      return NextResponse.json({ ok: true, ...report });
    }

    if (op === "mirotech-reorg-manifest") {
      const manifest = await buildMirotechReorgManifest();
      return NextResponse.json({ ok: true, ...manifest });
    }

    if (op === "mirotech-cms-rewrite-batch") {
      const pairs = Array.isArray(body.pairs) ? body.pairs : [];
      const result = await rewriteMirotechCmsKeyReferencesBatch(pairs);
      return NextResponse.json({ ok: true, ...result });
    }

    if (op === "brightline-all-media") {
      const maxKeys = Math.min(typeof body.maxKeys === "number" ? body.maxKeys : 5000, 8000);
      const kind = parseKindFilter(body.kind);
      const offset = typeof body.offset === "number" ? Math.max(0, body.offset) : 0;
      const limit = typeof body.limit === "number" ? Math.min(Math.max(1, body.limit), 500) : 200;
      const result = await collectBrightlineAllMedia({ maxKeys, kind, offset, limit });
      return NextResponse.json({
        ok: true,
        objects: result.objects,
        scanned: result.scanned,
        truncated: result.truncated,
        dbReferenced: result.dbReferenced,
        bucketScanAdded: result.bucketScanAdded,
        kind,
        totalSorted: result.totalSorted,
        offset: result.offset,
        limit: result.limit,
        hasMore: result.hasMore,
      });
    }

    if (op === "videos") {
      const maxKeys = Math.min(typeof body.maxKeys === "number" ? body.maxKeys : 5000, 8000);
      const keySet = new Set<string>();
      const objects: Array<{
        key: string;
        name: string;
        size: number;
        sizeLabel: string;
        lastModified: string | null;
        quality: string;
        qualityLabel: string;
        kind: "video";
        previewUrl: string;
        pairKey: string | null;
        pairPresent: boolean;
      }> = [];
      let truncated = false;

      for (const root of rootsForVault(vault)) {
        const flat = await listFlatWithSizes(root.prefix, maxKeys, vault);
        if (flat.truncated) truncated = true;
        for (const o of flat.objects) {
          if (detectR2Kind(o.key) !== "video") continue;
          try {
            assertR2ManagerKeyAllowed(o.key, vault);
          } catch {
            continue;
          }
          keySet.add(o.key);
          const quality = detectR2Quality(o.key);
          const pair = vault === "brightline" ? pairKeyCandidate(o.key) : null;
          objects.push({
            key: o.key,
            name: fileNameFromKey(o.key),
            size: o.size,
            sizeLabel: formatBytes(o.size),
            lastModified: null,
            quality,
            qualityLabel: qualityLabel(quality),
            kind: "video",
            previewUrl: previewUrlForKey(o.key, vault),
            pairKey: pair,
            pairPresent: pair ? keySet.has(pair) : false,
          });
          if (objects.length >= maxKeys) {
            truncated = true;
            break;
          }
        }
        if (objects.length >= maxKeys) break;
      }

      return NextResponse.json({
        ok: true,
        vault,
        objects,
        scanned: objects.length,
        truncated,
      });
    }

    const defaultPrefix = vault === "mirotech-site" ? "site/" : "portfolio/";
    const rawPrefix = (body.prefix ?? defaultPrefix).trim();
    const listVault = resolveVaultForListPrefix(rawPrefix, vault);
    const prefix = normalizePrefix(assertR2ManagerKeyAllowed(rawPrefix, listVault));
    const maxKeys = Math.min(typeof body.maxKeys === "number" ? body.maxKeys : 2000, 5000);
    const flat = await listFlatWithSizes(prefix, maxKeys, listVault);

    if (op === "orphans") {
      if (listVault !== "brightline") {
        return NextResponse.json({
          ok: true,
          prefix,
          orphans: [],
          scanned: flat.count,
          truncated: flat.truncated,
          vault: listVault,
          note: "Orphan scan uses Brightline DB references only.",
        });
      }
      const referenced = await collectReferencedR2KeysCached();
      const orphans = flat.objects
        .filter((o) => !referenced.has(o.key))
        .map((o) => mapListed(o, listVault));
      return NextResponse.json({
        ok: true,
        prefix,
        orphans,
        scanned: flat.count,
        truncated: flat.truncated,
        vault: listVault,
      });
    }

    if (op === "duplicates") {
      const groups = groupDuplicateKeys(flat.objects).map((g) => ({
        stem: g.stem,
        count: g.keys.length,
        keys: g.keys,
        items: g.keys.map((key, i) => mapListed({ key, size: g.sizes[i] ?? 0 }, listVault)),
      }));
      return NextResponse.json({
        ok: true,
        prefix,
        duplicates: groups,
        scanned: flat.count,
        truncated: flat.truncated,
        vault: listVault,
      });
    }

    if (op === "heavy") {
      const heavy = flat.objects
        .filter((o) => isHeavyObject(o.key, o.size))
        .sort((a, b) => b.size - a.size)
        .map((o) => mapListed(o, listVault));
      return NextResponse.json({
        ok: true,
        prefix,
        heavy,
        scanned: flat.count,
        truncated: flat.truncated,
        vault: listVault,
      });
    }

    const keySet = new Set(flat.objects.map((o) => o.key));
    const missingFull: string[] = [];
    const missingThumb: string[] = [];
    const missingPoster: string[] = [];
    const missingVideo: string[] = [];
    for (const o of flat.objects) {
      const q = detectR2Quality(o.key);
      const pair = pairKeyCandidate(o.key);
      if (!pair) continue;
      const lower = o.key.toLowerCase();
      if (lower.includes("/web_video/")) {
        if (/\.mp4$/i.test(lower) && !keySet.has(pair)) missingPoster.push(o.key);
        if (/-poster\.(webp|png)$/i.test(lower) && !keySet.has(pair)) missingVideo.push(o.key);
        continue;
      }
      if (q === "full" && !keySet.has(pair)) missingThumb.push(o.key);
      if (q === "thumb" && !keySet.has(pair)) missingFull.push(o.key);
    }
    return NextResponse.json({
      ok: true,
      prefix,
      missingThumb,
      missingFull,
      missingPoster,
      missingVideo,
      scanned: flat.count,
      truncated: flat.truncated,
      vault: listVault,
    });
  } catch (err) {
    console.error("R2_MANAGER_TOOLS_ERROR", err);
    const message = err instanceof Error ? err.message : "Tool failed.";
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

function parseKindFilter(raw: string | undefined): UnifiedMediaKindFilter {
  const k = (raw ?? "all").trim().toLowerCase();
  return k === "image" || k === "video" ? k : "all";
}

function mapListed(o: { key: string; size: number }, vault: R2VaultId = "brightline") {
  const quality = detectR2Quality(o.key);
  return {
    key: o.key,
    name: fileNameFromKey(o.key),
    size: o.size,
    sizeLabel: formatBytes(o.size),
    quality,
    qualityLabel: qualityLabel(quality),
    previewUrl: previewUrlForKey(o.key, vault),
  };
}

async function listFlatWithSizes(prefix: string, maxTotal: number, vault: R2VaultId = "brightline") {
  const objects: Array<{ key: string; size: number }> = [];
  let token: string | undefined;
  let truncated = false;
  let bytes = 0;

  do {
    const page = await listObjectsWithMeta({
      prefix,
      maxKeys: 1000,
      continuationToken: token,
      vault,
    });
    for (const o of page.objects) {
      objects.push({ key: o.key, size: o.size });
      bytes += o.size;
      if (objects.length >= maxTotal) {
        truncated = true;
        break;
      }
    }
    token = page.nextContinuationToken;
    if (objects.length >= maxTotal) break;
  } while (token);

  if (token) truncated = true;
  return { objects, count: objects.length, bytes, truncated };
}
