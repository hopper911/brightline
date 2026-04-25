import type { StudioProjectWithHero } from "@/lib/studio/studio-project-cms";
import { studioProjectAdminEditUrl, studioProjectLiveUrl } from "@/lib/studio/studio-project-urls";

/** JSON-safe StudioProject row for API responses (Dates → ISO strings). */
export function studioProjectToJson(project: StudioProjectWithHero) {
  return {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    publishedAt: project.publishedAt?.toISOString() ?? null,
  };
}

export function addStudioProjectUrls(project: StudioProjectWithHero) {
  return {
    websiteProjectId: project.id,
    draftUrl: studioProjectAdminEditUrl(project.id),
    liveUrl: project.published ? studioProjectLiveUrl(project.slug) : null,
  };
}
