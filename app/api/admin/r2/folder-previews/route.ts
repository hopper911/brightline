import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import {
  assertR2ManagerKeyAllowed,
  normalizePrefix,
  sampleFolderPreview,
  type FolderPreview,
} from "@/lib/admin-r2-manager";
import { isR2VaultId, resolveVaultForListPrefix, type R2VaultId } from "@/lib/r2-vaults-shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Batch-sample folder previews for Browse R2 library home (mixed vaults).
 * Body: { folders: Array<{ prefix: string; vault?: string }> }
 */
export async function POST(req: Request) {
  if (!(await authorizeAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: { folders?: Array<{ prefix?: string; vault?: string }> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const input = (body.folders ?? []).slice(0, 24);
  if (!input.length) {
    return NextResponse.json({ ok: true, folders: [] as FolderPreview[] });
  }

  const results: Array<FolderPreview & { vault: R2VaultId }> = [];

  for (const item of input) {
    const prefix = normalizePrefix(typeof item.prefix === "string" ? item.prefix : "");
    const requestedVault: R2VaultId = isR2VaultId(item.vault) ? item.vault : "brightline";
    const vault = resolveVaultForListPrefix(prefix, requestedVault);
    if (!prefix) {
      results.push({ prefix: "", previewUrls: [], previewKind: "empty", vault });
      continue;
    }
    try {
      assertR2ManagerKeyAllowed(prefix, vault);
    } catch {
      results.push({ prefix, previewUrls: [], previewKind: "empty", vault });
      continue;
    }
    const preview = await sampleFolderPreview(prefix, vault);
    results.push({ ...preview, vault });
  }

  return NextResponse.json({ ok: true, folders: results });
}
