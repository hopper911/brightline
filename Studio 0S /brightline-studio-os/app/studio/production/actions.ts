"use server";

import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  type Project,
  type CreateProjectInput,
} from "@/lib/projects/store";
import { getPendingHandoffs, acceptHandoff, dismissHandoff } from "@/lib/handoffs/store";
import { getEventsByProject } from "@/lib/events/store";
import {
  runGenerateProjectBrief,
  runGenerateShotList,
  runGenerateChecklist,
  runSummarizeProject,
  createStatusChangeApproval,
} from "@/lib/agents/producerAgent";
import { logEvent } from "@/lib/events/logger";
import { isDemoMode } from "@/lib/runtime/demo";
import { runWithDemoMode } from "@/lib/runtime/demoContext";
import { assertNotDemoMode } from "@/lib/runtime/demoGuard";

export type ProjectOption = { id: string; name: string };

export async function getProjectsList(): Promise<ProjectOption[]> {
  const projects = listProjects();
  return projects.map((p) => ({ id: p.id, name: p.name }));
}

export async function getProjectDetail(id: string): Promise<Project | null> {
  return getProject(id);
}

export async function createProjectAction(input: CreateProjectInput): Promise<{ id: string } | { error: string }> {
  try {
    const demo = await isDemoMode();
    return runWithDemoMode(demo, async () => {
      assertNotDemoMode("Creating projects");
      const p = createProject(input);
      logEvent({
        room: "production",
        agent: "Producer Agent",
        type: "project_created",
        status: "success",
        summary: `Project "${p.name}" created`,
        projectId: p.id,
      });
      return { id: p.id };
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create project" };
  }
}

export async function updateProjectAction(
  id: string,
  input: Partial<CreateProjectInput>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const demo = await isDemoMode();
    return runWithDemoMode(demo, async () => {
      assertNotDemoMode("Updating projects");
      const p = updateProject(id, input);
      if (!p) return { ok: false, error: "Project not found" };
      return { ok: true };
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to update" };
  }
}

export async function getProjectTimeline(projectId: string) {
  return getEventsByProject(projectId);
}

export async function getHandoffs() {
  return getPendingHandoffs("production");
}

export async function acceptHandoffAction(id: string): Promise<{ ok: boolean }> {
  const demo = await isDemoMode();
  return runWithDemoMode(demo, async () => {
    assertNotDemoMode("Accepting handoffs");
    return { ok: acceptHandoff(id) };
  });
}

export async function dismissHandoffAction(id: string): Promise<{ ok: boolean }> {
  const demo = await isDemoMode();
  return runWithDemoMode(demo, async () => {
    assertNotDemoMode("Dismissing handoffs");
    return { ok: dismissHandoff(id) };
  });
}

export async function generateBrief(projectId: string) {
  const p = getProject(projectId);
  if (!p) return { error: "Project not found" };
  return runGenerateProjectBrief({
    projectId,
    projectName: p.name,
    notes: p.notes ?? "",
  });
}

export async function generateShotListAction(projectId: string, count?: number) {
  const p = getProject(projectId);
  if (!p) return { error: "Project not found" };
  return runGenerateShotList({ projectId, projectName: p.name, count });
}

export async function generateChecklistAction(projectId: string, kind: "shoot" | "gear") {
  const p = getProject(projectId);
  if (!p) return { error: "Project not found" };
  return runGenerateChecklist({ projectId, projectName: p.name, kind });
}

export async function summarizeProjectAction(projectId: string) {
  const p = getProject(projectId);
  if (!p) return { error: "Project not found" };
  return runSummarizeProject({
    projectId,
    projectName: p.name,
    notes: p.notes ?? "",
  });
}

export async function requestStatusChange(projectId: string, suggestedStatus: string) {
  const demo = await isDemoMode();
  return runWithDemoMode(demo, async () => {
    assertNotDemoMode("Requesting status changes");
    createStatusChangeApproval({ projectId, suggestedStatus });
  });
}
