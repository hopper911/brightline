"use server";

import { MOCK_PROJECTS } from "@/lib/studio/mockData";

export interface ProjectOption {
  id: string;
  name: string;
}

/**
 * Returns projects for the Marketing room selector. Visual-only: uses mock data.
 * Replace with getDb() when deploying with SQLite.
 */
export async function getProjects(): Promise<ProjectOption[]> {
  return MOCK_PROJECTS;
}

/**
 * Mock caption generation. Visual-only: no DB write or event logging.
 * Re-add drafts insert and logEvent() when deploying with SQLite.
 */
export async function generateCaption(projectId: string): Promise<{ caption: string; draftId: string }> {
  const project = MOCK_PROJECTS.find((p) => p.id === projectId);
  const projectName = project?.name ?? "Unknown project";
  const mockCaption = `Behind the scenes: ${projectName}. Shot with care. — Bright Line Studio`;
  const draftId = `draft-${Date.now()}-mock`;
  return { caption: mockCaption, draftId };
}
