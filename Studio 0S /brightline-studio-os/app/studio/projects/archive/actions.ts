"use server";

import {
  searchArchive,
  getArchiveFilters,
  getRecentProjects,
  getRepeatClients,
  getProjectsByLocation,
} from "@/lib/archive/store";
import { getEventsByProject } from "@/lib/events/store";
import { getDrafts } from "@/lib/drafts/store";
import { getApprovalsByProject } from "@/lib/approvals/store";

export type ArchiveSearchParams = {
  q?: string;
  client?: string;
  type?: string;
  location?: string;
  year?: string;
};

export async function searchArchiveAction(params: ArchiveSearchParams) {
  return searchArchive({ ...params, limit: 50 });
}

export async function getArchiveFiltersAction() {
  return getArchiveFilters();
}

export async function getRecentProjectsAction(limit = 10) {
  return getRecentProjects(limit);
}

export async function getRepeatClientsAction() {
  return getRepeatClients(2);
}

export async function getProjectsByLocationAction(location: string) {
  return getProjectsByLocation(location);
}

export async function getProjectTimelineAction(projectId: string) {
  return getEventsByProject(projectId);
}

export async function getProjectDraftsAction(projectId: string) {
  return getDrafts(undefined, projectId);
}

export async function getProjectApprovalsAction(projectId: string) {
  return getApprovalsByProject(projectId);
}
