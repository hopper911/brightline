/** Maps each default pillar to related service page slugs for internal linking. */
export const PILLAR_TO_SERVICE_SLUGS: Record<string, string[]> = {
  architecture: [
    "architecture-photography",
    "commercial-real-estate-photography",
  ],
  advertising: ["fashion-campaign-photography"],
  corporate: ["commercial-real-estate-photography"],
};

export function getServiceSlugsForPillar(slug: string): string[] {
  return PILLAR_TO_SERVICE_SLUGS[slug] ?? [];
}
