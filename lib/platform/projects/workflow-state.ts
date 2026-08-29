import "server-only";

import type { ContentRef } from "@/lib/platform/content/types";
import { contentRefKey } from "@/lib/platform/content/types";
import type { ProjectWorkflowLifecycle } from "@/lib/platform/projects/types";
import { prisma } from "@/lib/prisma";

const STATE_PREFIX = "project_workflow_state:v1:";

export type StoredProjectWorkflowState = {
  lifecycle: ProjectWorkflowLifecycle;
  reviewNotes: string | null;
  updatedAt: string;
  /** Mirotech case study workflow template applied at create (Phase 23A). */
  templateId?: string | null;
};

function stateKey(ref: ContentRef): string {
  return `${STATE_PREFIX}${contentRefKey(ref)}`;
}

export async function getStoredProjectWorkflowState(
  ref: ContentRef
): Promise<StoredProjectWorkflowState | null> {
  const row = await prisma.siteSetting.findUnique({ where: { key: stateKey(ref) } });
  if (!row?.value) return null;
  try {
    const parsed = JSON.parse(row.value) as StoredProjectWorkflowState;
    if (!parsed.lifecycle) return null;
    return {
      lifecycle: parsed.lifecycle,
      reviewNotes: parsed.reviewNotes ?? null,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      templateId: parsed.templateId ?? null,
    };
  } catch {
    return null;
  }
}

export async function setStoredProjectWorkflowState(
  ref: ContentRef,
  state: StoredProjectWorkflowState
): Promise<void> {
  const key = stateKey(ref);
  const value = JSON.stringify({
    lifecycle: state.lifecycle,
    reviewNotes: state.reviewNotes ?? null,
    updatedAt: state.updatedAt,
    templateId: state.templateId ?? null,
  });
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function loadAllStoredProjectWorkflowStates(): Promise<
  Map<string, StoredProjectWorkflowState>
> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { startsWith: STATE_PREFIX } },
  });
  const map = new Map<string, StoredProjectWorkflowState>();
  for (const row of rows) {
    const refKey = row.key.slice(STATE_PREFIX.length);
    try {
      const parsed = JSON.parse(row.value ?? "") as StoredProjectWorkflowState;
      if (parsed.lifecycle) {
        map.set(refKey, {
          lifecycle: parsed.lifecycle,
          reviewNotes: parsed.reviewNotes ?? null,
          updatedAt: parsed.updatedAt ?? new Date().toISOString(),
          templateId: parsed.templateId ?? null,
        });
      }
    } catch {
      /* skip corrupt rows */
    }
  }
  return map;
}

export function storedWorkflowStateForRef(
  ref: ContentRef,
  allStates: Map<string, StoredProjectWorkflowState>
): StoredProjectWorkflowState | null {
  return allStates.get(contentRefKey(ref)) ?? null;
}
