import "server-only";

import type { ContentRef } from "@/lib/platform/content/types";
import { contentRefKey } from "@/lib/platform/content/types";
import { prisma } from "@/lib/prisma";

const SNAPSHOT_PREFIX = "project_published_snapshot:v1:";

export type StoredProjectPublishedSnapshot = {
  title: string;
  slug: string;
  publicPath: string | null;
  publishedAt: string;
  heroKey: string | null;
  summary: string | null;
};

function snapshotKey(ref: ContentRef): string {
  return `${SNAPSHOT_PREFIX}${contentRefKey(ref)}`;
}

export async function getStoredProjectPublishedSnapshot(
  ref: ContentRef
): Promise<StoredProjectPublishedSnapshot | null> {
  const row = await prisma.siteSetting.findUnique({ where: { key: snapshotKey(ref) } });
  if (!row?.value) return null;
  try {
    return JSON.parse(row.value) as StoredProjectPublishedSnapshot;
  } catch {
    return null;
  }
}

export async function setStoredProjectPublishedSnapshot(
  ref: ContentRef,
  snapshot: StoredProjectPublishedSnapshot
): Promise<void> {
  const key = snapshotKey(ref);
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value: JSON.stringify(snapshot) },
    update: { value: JSON.stringify(snapshot) },
  });
}
