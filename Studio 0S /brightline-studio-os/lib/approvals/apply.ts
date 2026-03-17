/**
 * Bright Line Studio OS – apply approved actions
 *
 * When an approval is approved, this applies the payload to the system.
 */

import type { Approval } from "@/lib/approvals/store";
import { getDb } from "@/lib/db";
import { updateProject } from "@/lib/projects/store";

export function applyApprovalPayload(approval: Approval): void {
  if (approval.status !== "approved") return;
  try {
    const payload = approval.payloadJson ? JSON.parse(approval.payloadJson) : null;
    if (!payload) return;

    switch (approval.actionType) {
      case "project_brief_save": {
        const { projectId, brief } = payload as { projectId: string; brief: { project_name: string; client: string; type: string; notes: string } };
        if (projectId && brief) {
          updateProject(projectId, {
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
          updateProject(projectId, { status: suggestedStatus });
        }
        break;
      }
      case "delivery_draft_save": {
        const { projectId } = payload as { projectId: string };
        if (projectId) {
          try {
            getDb().prepare("UPDATE projects SET delivery_state = ?, updated_at = ? WHERE id = ?").run("ready", new Date().toISOString(), projectId);
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
