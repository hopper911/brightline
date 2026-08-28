/**
 * Mirotech hub CMS remote writes (Phase 6D domain layer).
 */

import type {
  HubJournalPost,
  HubJournalSummary,
  HubProject,
} from "@/lib/dual-brand/studio-hub";
import { mirotechContentFetch } from "@/lib/platform/publishing/mirotech/remote-client";

export async function mirotechCreateHubProject(
  payload: Record<string, unknown>
): Promise<HubProject> {
  const data = await mirotechContentFetch("/api/content/v1/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.project as HubProject;
}

export async function mirotechUpdateHubProject(
  id: string,
  payload: Record<string, unknown>
): Promise<HubProject> {
  const data = await mirotechContentFetch(
    `/api/content/v1/projects/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(payload) }
  );
  return data.project as HubProject;
}

export async function mirotechDeleteHubProject(
  id: string
): Promise<{ id: string; slug: string; title: string }> {
  const data = await mirotechContentFetch(
    `/api/content/v1/projects/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
  const deleted = data.deleted as { id: string; slug: string; title: string } | undefined;
  if (!deleted?.id) {
    throw new Error("Hub delete returned no project");
  }
  return deleted;
}

export async function mirotechCreateHubBlog(
  projectId: string,
  payload: Record<string, unknown> = {}
): Promise<{ created: boolean; post: HubJournalPost; summary: HubJournalSummary }> {
  const data = await mirotechContentFetch(
    `/api/content/v1/projects/${encodeURIComponent(projectId)}/blog`,
    { method: "POST", body: JSON.stringify(payload) }
  );
  return {
    created: Boolean(data.created),
    post: data.post as HubJournalPost,
    summary: data.summary as HubJournalSummary,
  };
}

export async function mirotechUpdateHubBlog(
  projectId: string,
  payload: Record<string, unknown>
): Promise<{ post: HubJournalPost; summary: HubJournalSummary }> {
  const data = await mirotechContentFetch(
    `/api/content/v1/projects/${encodeURIComponent(projectId)}/blog`,
    { method: "PATCH", body: JSON.stringify(payload) }
  );
  return {
    post: data.post as HubJournalPost,
    summary: data.summary as HubJournalSummary,
  };
}
