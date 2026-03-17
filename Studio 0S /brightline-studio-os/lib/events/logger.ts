/**
 * Bright Line Studio OS – event logger
 *
 * In-memory only for living-system phase. No DB or filesystem.
 */

import { addEvent, type EventRecord } from "./store";

export type LogEventParams = {
  room: string;
  agent: string;
  type: string;
  status: string;
  summary: string;
  projectId?: string | null;
  workspaceId?: string;
};

export function logEvent(params: LogEventParams): EventRecord {
  return addEvent({
    ...params,
    projectId: params.projectId ?? null,
    workspaceId: params.workspaceId,
  });
}

export { getEvents, getEventsByProject, getEventsForWorkspace, getEventsByProjectForWorkspace } from "./store";
export type { EventRecord } from "./store";
