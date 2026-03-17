/**
 * Bright Line Studio OS – apply approved actions
 *
 * When an approval is approved, this applies the payload to the system.
 */

import type { Approval } from "@/lib/approvals/store";
import { getDb } from "@/lib/db";
import { updateProjectForWorkspace } from "@/lib/projects/store";

export async function applyApprovalPayload(approval: Approval): Promise<void> {
  if (approval.status !== "approved") return;
  try {
    const payload = approval.payloadJson ? JSON.parse(approval.payloadJson) : null;
    if (!payload) return;

    switch (approval.actionType) {
      case "automation_prepared_action": {
        const prepared = (payload as any)?.prepared as
          | { kind: "create_draft"; room: string; draftType: string; content: string; projectId?: string | null }
          | { kind: "create_reminder"; reminderType: string; message: string; dueDate: string; projectId?: string | null }
          | { kind: "suggest_next_task" };
        if (!prepared || typeof prepared !== "object") break;
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
            type: prepared.reminderType as any,
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
