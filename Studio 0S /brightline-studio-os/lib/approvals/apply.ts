/**
 * Bright Line Studio OS – apply approved actions
 *
 * When an approval is approved, this applies the payload to the system.
 */

import type { Approval } from "@/lib/approvals/store";
import { getDb } from "@/lib/db";
import { updateProjectForWorkspace } from "@/lib/projects/store";

type PreparedAutomationAction =
  | { kind: "create_draft"; room: string; draftType: string; content: string; projectId?: string | null }
  | { kind: "create_reminder"; reminderType: "follow-up" | "delivery" | "payment"; message: string; dueDate: string; projectId?: string | null }
  | { kind: "suggest_next_task" };

function parsePreparedAction(value: unknown): PreparedAutomationAction | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const kind = v.kind;
  if (kind === "create_draft") {
    if (typeof v.room !== "string") return null;
    if (typeof v.draftType !== "string") return null;
    if (typeof v.content !== "string") return null;
    const projectId = v.projectId;
    return {
      kind,
      room: v.room,
      draftType: v.draftType,
      content: v.content,
      projectId: typeof projectId === "string" ? projectId : projectId === null ? null : undefined,
    };
  }
  if (kind === "create_reminder") {
    if (v.reminderType !== "follow-up" && v.reminderType !== "delivery" && v.reminderType !== "payment") return null;
    if (typeof v.message !== "string") return null;
    if (typeof v.dueDate !== "string") return null;
    const projectId = v.projectId;
    return {
      kind,
      reminderType: v.reminderType,
      message: v.message,
      dueDate: v.dueDate,
      projectId: typeof projectId === "string" ? projectId : projectId === null ? null : undefined,
    };
  }
  if (kind === "suggest_next_task") {
    return { kind };
  }
  return null;
}

export async function applyApprovalPayload(approval: Approval): Promise<void> {
  if (approval.status !== "approved") return;
  try {
    const payload = approval.payloadJson ? JSON.parse(approval.payloadJson) : null;
    if (!payload) return;

    switch (approval.actionType) {
      case "automation_prepared_action": {
        const prepared = parsePreparedAction((payload as { prepared?: unknown } | null)?.prepared);
        if (!prepared) break;
        if (prepared.kind === "create_draft") {
          const { saveDraft } = await import("@/lib/drafts/store");
          saveDraft({
            room: prepared.room,
            type: prepared.draftType,
            content: prepared.content,
            projectId: prepared.projectId ?? undefined,
            workspaceId: approval.workspaceId,
          });
        }
        if (prepared.kind === "create_reminder") {
          const { createReminder } = await import("@/lib/reminders/store");
          createReminder({
            type: prepared.reminderType,
            message: prepared.message,
            dueDate: prepared.dueDate,
            projectId: prepared.projectId ?? undefined,
            workspaceId: approval.workspaceId,
          });
        }
        break;
      }
      case "project_brief_save": {
        const { projectId, brief } = payload as { projectId: string; brief: { project_name: string; client: string; type: string; notes: string } };
        if (projectId && brief) {
          updateProjectForWorkspace(approval.workspaceId, projectId, {
            name: brief.project_name,
            client: brief.client,
            type: brief.type,
            notes: brief.notes,
          });
        }
        break;
      }
      case "project_status_change": {
        const { projectId, suggestedStatus } = payload as { projectId: string; suggestedStatus: string };
        if (projectId && suggestedStatus) {
          updateProjectForWorkspace(approval.workspaceId, projectId, { status: suggestedStatus });
        }
        break;
      }
      case "delivery_draft_save": {
        const { projectId } = payload as { projectId: string };
        if (projectId) {
          try {
            getDb()
              .prepare("UPDATE projects SET delivery_state = ?, updated_at = ? WHERE workspace_id = ? AND id = ?")
              .run("ready", new Date().toISOString(), approval.workspaceId, projectId);
          } catch {
            /* delivery_state column may not exist in older DBs */
          }
        }
        break;
      }
      default:
        break;
    }
  } catch {
    /* ignore parse/apply errors */
  }
}
