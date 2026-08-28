import { fetchMirotechSiteWork, fetchMirotechSiteWorkBySlug } from "@/lib/dual-brand/content-api";
import { getHubProject, listHubProjects } from "@/lib/dual-brand/studio-hub";
import type { MirotechContentReadPort } from "@/lib/platform/content/integrations/mirotech-content-read-port";

/** Default read port — delegates to existing dual-brand modules without duplicating rules. */
export const defaultMirotechContentReadPort: MirotechContentReadPort = {
  getHubProjectById: (id) => getHubProject(id),
  getMirotechWorkBySlug: (slug) => fetchMirotechSiteWorkBySlug(slug),
  listHubProjects: () => listHubProjects(),
  listMirotechCaseStudies: () => fetchMirotechSiteWork(),
};
