import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  assertR2ManagerKeyAllowed,
  detectR2Kind,
  detectR2Quality,
  fileNameFromKey,
  isR2ManagerKeyAllowed,
  normalizePrefix,
  pairKeyCandidate,
  previewUrlForKey,
  qualityLabel,
  formatBytes,
  isValidR2FolderPrefix,
  rootsForVault,
  sampleFolderPreviews,
  type FolderPreview,
} from "@/lib/admin-r2-manager";
import { normalizeR2VaultId, resolveVaultForListPrefix, type R2VaultId } from "@/lib/r2-vaults";
import { sortMediaByLastModified } from "@/lib/admin-r2-unified-media-sort";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mergeRootPrefixes(discovered: string[], vault: R2VaultId): string[] {
  const set = new Set<string>();
  for (const p of discovered) {
    const n = normalizePrefix(p);
    if (n) set.add(n);
  }
  for (const r of rootsForVault(vault)) {
    set.add(r.prefix);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

function mapObjects(
  objects: Array<{ key: string; size: number; lastModified: string | null }>,
  keySet: Set<string>,
  vault: R2VaultId
) {
  return objects
    .filter((o) => {
      try {
        assertR2ManagerKeyAllowed(o.key, vault);
        return true;
      } catch {
        return false;
      }
    })
    .map((o) => {
      const quality = detectR2Quality(o.key);
      const pair = vault === "brightline" ? pairKeyCandidate(o.key) : null;
      return {
        key: o.key,
        name: fileNameFromKey(o.key),
        size: o.size,
        sizeLabel: formatBytes(o.size),
        lastModified: o.lastModified,
        quality,
        qualityLabel: qualityLabel(quality),
        kind: detectR2Kind(o.key),
        previewUrl: previewUrlForKey(o.key, vault),
        pairKey: pair,
        pairPresent: pair ? keySet.has(pair) : false,
      };
    });
}

async function withFolderPreviews(
  prefixes: string[],
  vault: R2VaultId
): Promise<{
  prefixes: string[];
  folders: FolderPreview[];
}> {
  const allowed = prefixes
    .map((p) => normalizePrefix(p))
    .filter((p) => isValidR2FolderPrefix(p))
    .filter((p) => {
      try {
        assertR2ManagerKeyAllowed(p, vault);
        return true;
      } catch {
        return false;
      }
    });

  const folders = await sampleFolderPreviews(allowed, 4, vault);
  return {
    prefixes: allowed,
    folders,
  };
}

export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: {
    prefix?: string;
    maxKeys?: number;
    continuationToken?: string;
    vault?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const rawPrefix = (body.prefix ?? "").trim();
  const vault = resolveVaultForListPrefix(rawPrefix, normalizeR2VaultId(body.vault));
  const roots = rootsForVault(vault);
  const maxKeys = Math.min(typeof body.maxKeys === "number" ? body.maxKeys : 60, 200);

  // Root: favorites + discovered allowlisted top-level prefixes
  if (!rawPrefix) {
    try {
      let discovered: string[] = [];
      try {
        const listed = await listObjectsDelimited({
          prefix: "",
          delimiter: "/",
          maxKeys: 200,
          vault,
        });
        discovered = listed.prefixes.filter(
          (p) => isR2ManagerKeyAllowed(p, vault) && isValidR2FolderPrefix(p)
        );
      } catch (err) {
        console.error("R2_MANAGER_ROOT_DISCOVER_ERROR", err);
      }
      const prefixes = mergeRootPrefixes(discovered, vault);
      const { folders } = await withFolderPreviews(prefixes, vault);
      return NextResponse.json({
        ok: true,
        vault,
        prefix: "",
        prefixes: folders.map((f) => f.prefix),
        folders,
        objects: [],
        roots,
        isTruncated: false,
        nextContinuationToken: null,
      });
    } catch (err) {
      console.error("R2_MANAGER_ROOT_LIST_ERROR", err);
      const status =
        typeof err === "object" &&
        err &&
        "status" in err &&
        typeof (err as { status: number }).status === "number"
          ? (err as { status: number }).status
          : 500;
      if (status === 503) {
        return NextResponse.json(
          {
            ok: false,
            error: err instanceof Error ? err.message : "Vault not configured.",
            code:
              typeof err === "object" && err && "code" in err
                ? (err as { code: string }).code
                : undefined,
            vault,
          },
          { status: 503 }
        );
      }
      const prefixes = roots.map((r) => r.prefix);
      return NextResponse.json({
        ok: true,
        vault,
        prefix: "",
        prefixes,
        folders: prefixes.map((prefix) => ({
          prefix,
          previewUrls: [] as string[],
          previewKind: "empty" as const,
        })),
        objects: [],
        roots,
        isTruncated: false,
        nextContinuationToken: null,
        warning: err instanceof Error ? err.message : "Root list failed; showing favorites only.",
      });
    }
  }

  let prefix: string;
  try {
    prefix = normalizePrefix(assertR2ManagerKeyAllowed(rawPrefix, vault));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid prefix.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  try {
    const listed = await listObjectsDelimited({
      prefix,
      maxKeys,
      continuationToken: body.continuationToken || undefined,
      vault,
    });

    const keySet = new Set(listed.objects.map((o) => o.key));
    const objects = sortMediaByLastModified(mapObjects(listed.objects, keySet, vault));
    const childPrefixes = listed.prefixes
      .map((p) => normalizePrefix(p))
      .filter((p) => isValidR2FolderPrefix(p))
      .filter((p) => {
        try {
          assertR2ManagerKeyAllowed(p, vault);
          return true;
        } catch {
          return false;
        }
      });
    const { folders } = await withFolderPreviews(childPrefixes, vault);

    return NextResponse.json({
      ok: true,
      vault,
      prefix,
      prefixes: folders.map((f) => f.prefix),
      folders,
      objects,
      roots,
      isTruncated: listed.isTruncated,
      nextContinuationToken: listed.nextContinuationToken ?? null,
    });
  } catch (err) {
    console.error("R2_MANAGER_LIST_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to list objects.";
    const status =
      typeof err === "object" &&
      err &&
      "status" in err &&
      typeof (err as { status: number }).status === "number"
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json({ ok: false, error: message, vault }, { status });
  }
}
