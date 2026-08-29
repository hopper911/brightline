/**
 * Import key registry for idempotent bulk project ingestion (Phase 24).
 */

import "server-only";

import type { ContentRef } from "@/lib/platform/content/types";
import { contentRefKey } from "@/lib/platform/content/types";
import type { ProjectWorkflowKind } from "@/lib/platform/projects/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";
import { prisma } from "@/lib/prisma";

const PREFIX = "project_import_key:v1:";

export type StoredProjectImportKey = {
  tenant: TenantSlug;
  kind: ProjectWorkflowKind;
  importKey: string;
  ref: ContentRef;
  createdAt: string;
};

function registryKey(tenant: TenantSlug, kind: ProjectWorkflowKind, importKey: string): string {
  return `${PREFIX}${tenant}:${kind}:${importKey.trim()}`;
}

export async function findProjectImportKey(
  tenant: TenantSlug,
  kind: ProjectWorkflowKind,
  importKey: string
): Promise<StoredProjectImportKey | null> {
  const key = importKey.trim();
  if (!key) return null;
  const row = await prisma.siteSetting.findUnique({ where: { key: registryKey(tenant, kind, key) } });
  if (!row?.value) return null;
  try {
    const parsed = JSON.parse(row.value) as StoredProjectImportKey;
    if (!parsed.ref?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function registerProjectImportKey(
  tenant: TenantSlug,
  kind: ProjectWorkflowKind,
  importKey: string,
  ref: ContentRef
): Promise<void> {
  const key = importKey.trim();
  if (!key) return;
  const value = JSON.stringify({
    tenant,
    kind,
    importKey: key,
    ref,
    createdAt: new Date().toISOString(),
  } satisfies StoredProjectImportKey);
  await prisma.siteSetting.upsert({
    where: { key: registryKey(tenant, kind, key) },
    create: { key: registryKey(tenant, kind, key), value },
    update: { value },
  });
}

export async function loadProjectImportKeysForTenant(
  tenant: TenantSlug,
  kind: ProjectWorkflowKind
): Promise<Map<string, StoredProjectImportKey>> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { startsWith: `${PREFIX}${tenant}:${kind}:` } },
  });
  const map = new Map<string, StoredProjectImportKey>();
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.value ?? "") as StoredProjectImportKey;
      if (parsed.importKey && parsed.ref?.id) {
        map.set(parsed.importKey, parsed);
      }
    } catch {
      /* skip */
    }
  }
  return map;
}

export function importKeyFromContentRef(ref: ContentRef): string {
  return contentRefKey(ref);
}
