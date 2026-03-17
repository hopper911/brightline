import "server-only";

import { getDb } from "@/lib/db";

export function resolveWorkspaceId(explicit?: string): string {
  if (explicit && explicit.trim()) return explicit;
  const db = getDb();
  const row = db
    .prepare("SELECT id FROM workspaces ORDER BY created_at ASC LIMIT 1")
    .get() as { id: string } | undefined;
  if (!row?.id) {
    throw new Error("No workspace exists. Database bootstrap did not run.");
  }
  return row.id;
}

