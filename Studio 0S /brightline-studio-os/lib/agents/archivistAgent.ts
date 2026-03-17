/**
 * Bright Line Studio OS – Archivist Agent
 *
 * Read-only. Search projects, summarize history, locate drafts and deliverables.
 * No destructive actions.
 */

import {
  searchArchive,
  getArchiveProject,
  getRecentProjects,
  getRepeatClients,
  getProjectsByLocation,
} from "@/lib/archive/store";
import { getEventsByProject } from "@/lib/events/store";
import { getDrafts } from "@/lib/drafts/store";
import { getApprovalsByProject } from "@/lib/approvals/store";
import type { ArchiveProject } from "@/lib/archive/store";

export type ArchiveSearchInput = {
  q?: string;
  client?: string;
  type?: string;
  location?: string;
  year?: string;
  limit?: number;
};

export function runSearchProjects(params: ArchiveSearchInput): ArchiveProject[] {
  return searchArchive(params);
}

export function runGetRecentProjects(limit?: number): ArchiveProject[] {
  return getRecentProjects(limit ?? 10);
}

export function runGetRepeatClients(minProjects?: number): { client: string; count: number }[] {
  return getRepeatClients(minProjects ?? 2);
}

export function runGetProjectsByLocation(location: string): ArchiveProject[] {
  return getProjectsByLocation(location);
}

export type ProjectHistorySummary = {
  project: ArchiveProject;
  eventCount: number;
  draftCount: number;
  approvalCount: number;
  events: { room: string; type: string; summary: string; createdAt: string }[];
  drafts: { type: string; room: string; createdAt: string }[];
  approvals: { actionType: string; room: string; status: string; createdAt: string }[];
};

export function runSummarizeProjectHistory(projectId: string): ProjectHistorySummary | null {
  const project = getArchiveProject(projectId);
  if (!project) return null;

  const events = getEventsByProject(projectId);
  const drafts = getDrafts(undefined, projectId);
  const approvals = getApprovalsByProject(projectId);

  return {
    project,
    eventCount: events.length,
    draftCount: drafts.length,
    approvalCount: approvals.length,
    events: events.map((e) => ({
      room: e.room,
      type: e.type,
      summary: e.summary,
      createdAt: e.createdAt,
    })),
    drafts: drafts.map((d) => ({ type: d.type, room: d.room, createdAt: d.createdAt })),
    approvals: approvals.map((a) => ({
      actionType: a.actionType,
      room: a.room,
      status: a.status,
      createdAt: a.createdAt,
    })),
  };
}

export function runLocateDrafts(projectId: string) {
  return getDrafts(undefined, projectId);
}

export function runLocateDeliverables(projectId: string) {
  const project = runSummarizeProjectHistory(projectId)?.project;
  if (!project) return [];
  const drafts = getDrafts(undefined, projectId);
  const deliveryDrafts = drafts.filter(
    (d) =>
      d.type === "delivery_email" ||
      d.room === "delivery" ||
      d.type?.toLowerCase().includes("gallery")
  );
  const delivered = project.deliveryState === "complete" || project.status === "complete";
  return {
    projectName: project.name,
    delivered,
    deliveryDrafts,
  };
}

export function runSummarizeClientPatterns(client: string) {
  const projects = searchArchive({ client });
  const types = [...new Set(projects.map((p) => p.type).filter(Boolean))] as string[];
  const locations = [...new Set(projects.map((p) => p.location).filter(Boolean))] as string[];
  const years = [...new Set(projects.map((p) => p.year).filter(Boolean))] as string[];
  return {
    client,
    projectCount: projects.length,
    types,
    locations,
    years,
    projects: projects.map((p) => ({ id: p.id, name: p.name, type: p.type, year: p.year })),
  };
}
