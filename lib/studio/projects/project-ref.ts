import type { ContentRef } from "@/lib/platform/content/types";
import { contentRefKey, parseContentRef } from "@/lib/platform/content/types";
import { isProjectWorkflowKind } from "@/lib/platform/projects/types";

const WORKFLOW_TYPES = ["work-project", "mirotech-case-study"] as const;

export function encodeStudioProjectRefParam(ref: ContentRef): string {
  return encodeURIComponent(contentRefKey(ref));
}

export function parseStudioProjectRefParam(param: string): ContentRef | null {
  try {
    const decoded = decodeURIComponent(param.trim());
    const parts = decoded.split(":");
    if (parts.length < 3) return null;
    const tenant = parts[0];
    const type = parts[1];
    const id = parts.slice(2).join(":");
    const ref = parseContentRef({ tenant, type, id });
    if (!ref || !isProjectWorkflowKind(ref.type)) return null;
    return ref;
  } catch {
    return null;
  }
}

export function auditResourceTypeForProjectRef(ref: ContentRef): string {
  if (ref.type === "work-project") return "work-project";
  return "dual-brand-work";
}

export function isWorkflowProjectRef(ref: ContentRef): boolean {
  return WORKFLOW_TYPES.includes(ref.type as "work-project" | "mirotech-case-study");
}
