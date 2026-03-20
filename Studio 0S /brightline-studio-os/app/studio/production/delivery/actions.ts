"use server";

import { listProjects, getProject, updateProject } from "@/lib/projects/store";
import { getDrafts } from "@/lib/drafts/store";
import {
  runGenerateDeliveryChecklist,
  runGenerateDeliveryEmail,
  runSummarizeFinalAssets,
  runGenerateFollowup,
} from "@/lib/agents/deliveryAgent";
import { isDemoMode } from "@/lib/runtime/demo";
import { runWithDemoMode } from "@/lib/runtime/demoContext";
import { assertNotDemoMode } from "@/lib/runtime/demoGuard";

export async function getProjectsList() {
  return listProjects().map((p) => ({ id: p.id, name: p.name }));
}

export async function getProjectDetail(id: string) {
  return getProject(id);
}

export async function updateProjectStatus(projectId: string, status: string) {
  const demo = await isDemoMode();
  return runWithDemoMode(demo, async () => {
    assertNotDemoMode("Updating project status");
    return updateProject(projectId, { status });
  });
}

export async function updateProjectDeliveryNotes(projectId: string, deliverables: string) {
  const demo = await isDemoMode();
  return runWithDemoMode(demo, async () => {
    assertNotDemoMode("Updating delivery notes");
    return updateProject(projectId, { deliverables });
  });
}

export async function getProjectDrafts(projectId: string) {
  return getDrafts(undefined, projectId);
}

export async function generateDeliveryChecklistAction(projectId: string) {
  const p = getProject(projectId);
  if (!p) return { error: "Project not found" };
  return runGenerateDeliveryChecklist({ projectId, projectName: p.name });
}

export async function generateDeliveryEmailAction(projectId: string) {
  const p = getProject(projectId);
  if (!p) return { error: "Project not found" };
  return runGenerateDeliveryEmail({
    projectId,
    projectName: p.name,
    clientName: p.client ?? undefined,
  });
}

export async function summarizeAssetsAction(projectId: string) {
  const p = getProject(projectId);
  if (!p) return { error: "Project not found" };
  return runSummarizeFinalAssets({
    projectId,
    projectName: p.name,
    notes: p.notes ?? undefined,
  });
}

export async function generateFollowupAction(projectId: string) {
  const p = getProject(projectId);
  if (!p) return { error: "Project not found" };
  return runGenerateFollowup({ projectId, projectName: p.name });
}
