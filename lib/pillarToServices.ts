import type { PillarSlug } from "@/lib/portfolioPillars";

/** Maps each pillar to related service page slugs for internal linking. */
export const PILLAR_TO_SERVICE_SLUGS: Record<PillarSlug, string[]> = {
  architecture: [
    "architecture-photography",
    "commercial-real-estate-photography",
  ],
  campaign: ["fashion-campaign-photography"],
  corporate: ["commercial-real-estate-photography"],
};
