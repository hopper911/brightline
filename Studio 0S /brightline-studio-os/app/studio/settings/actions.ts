"use server";

import { isOllamaAvailable, clearOllamaCache, OLLAMA_DEFAULT_MODEL } from "@/lib/ai/ollama";
import { getDb } from "@/lib/db";
import { ensureWorkspaceContextCookies } from "@/lib/auth/workspaceContext";
import { getWorkspaceInfo, getWorkspaceUsageSnapshot } from "@/lib/usage/stats";

export type OllamaStatusResult = {
  available: boolean;
  model: string;
  fallbackMode: boolean;
};

export async function getOllamaStatus(): Promise<OllamaStatusResult> {
  const available = await isOllamaAvailable();
  return {
    available,
    model: OLLAMA_DEFAULT_MODEL,
    fallbackMode: !available,
  };
}

export async function refreshOllamaStatus(): Promise<OllamaStatusResult> {
  clearOllamaCache();
  return getOllamaStatus();
}

export type WorkspaceSettingsSummary = {
  workspace: { id: string; name: string; createdAt: string; ownerId: string };
  usage: ReturnType<typeof getWorkspaceUsageSnapshot>;
  aiMode: "local" | "fallback";
};

export async function getWorkspaceSettingsSummary(): Promise<WorkspaceSettingsSummary> {
  const ctx = await ensureWorkspaceContextCookies();
  const db = getDb();
  const aiRow = db
    .prepare("SELECT ai_mode AS aiMode FROM workspace_settings WHERE workspace_id = ? LIMIT 1")
    .get(ctx.workspaceId) as { aiMode: string } | undefined;
  const aiMode = aiRow?.aiMode === "fallback" ? "fallback" : "local";

  return {
    workspace: getWorkspaceInfo(ctx.workspaceId),
    usage: getWorkspaceUsageSnapshot(ctx.workspaceId),
    aiMode,
  };
}

export async function setAiMode(mode: "local" | "fallback"): Promise<{ ok: true }> {
  const ctx = await ensureWorkspaceContextCookies();
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO workspace_settings (workspace_id, ai_mode, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(workspace_id) DO UPDATE SET ai_mode = excluded.ai_mode, updated_at = excluded.updated_at`
  ).run(ctx.workspaceId, mode, now, now);
  return { ok: true };
}
