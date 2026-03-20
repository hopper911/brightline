"use server";

import { listProjects } from "@/lib/projects/store";
import { runMarketingCaption, runMarketingCaseStudy } from "@/lib/agents/marketingAgent";

export interface ProjectOption {
  id: string;
  name: string;
}

export async function getProjects(): Promise<ProjectOption[]> {
  const projects = listProjects();
  return projects.map((p) => ({ id: p.id, name: p.name }));
}

export async function generateCaption(
  projectId: string
): Promise<{ caption: string; draftId: string; source?: "ollama" | "fallback" } | { error: string }> {
  const { getProject } = await import("@/lib/projects/store");
  const project = getProject(projectId);
  const projectName = project?.name ?? "Unknown project";
  try {
    return await runMarketingCaption({ projectId, projectName });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Generation failed" };
  }
}

export type CaseStudyResult = {
  title: string;
  sections: string[];
  draftId: string;
  source?: "ollama" | "fallback";
};

export async function generateCaseStudy(projectId: string): Promise<CaseStudyResult | { error: string }> {
  const { getProject } = await import("@/lib/projects/store");
  const project = getProject(projectId);
  const projectName = project?.name ?? "Unknown project";
  try {
    return await runMarketingCaseStudy({ projectId, projectName });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Generation failed" };
  }
}
