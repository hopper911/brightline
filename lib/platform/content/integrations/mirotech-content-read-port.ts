import type { DualBrandWorkProject } from "@/lib/dual-brand/content-api";
import type { HubProject } from "@/lib/dual-brand/studio-hub";

/** Read seam for Mirotech domain content — wraps legacy HTTP clients (Phase 5B). */
export type MirotechContentReadPort = {
  getHubProjectById(id: string): Promise<HubProject | null>;
  getMirotechWorkBySlug(slug: string): Promise<DualBrandWorkProject | null>;
  listHubProjects(): Promise<HubProject[]>;
  listMirotechCaseStudies(): Promise<DualBrandWorkProject[]>;
};
