import type { PillarSlug } from "@/lib/portfolioPillars";

export type PillarDefaults = {
  ctaCopy: string;
  whoIsThisFor: string;
  serviceTypePhrase: string;
};

/** Default CTA and audience copy per pillar. Used when project has no custom ctaCopy or whoIsThisFor. */
export const PILLAR_CASE_STUDY_DEFAULTS: Record<PillarSlug, PillarDefaults> = {
  architecture: {
    ctaCopy:
      "Planning a commercial renovation, workplace launch, or architecture shoot? Bright Line Photography creates refined imagery for office interiors, real estate marketing, and design-driven commercial spaces. Request availability to discuss your timeline, deliverables, and usage needs.",
    whoIsThisFor:
      "general contractors, developers, architects, interior designers, commercial leasing teams, office landlords, workplace strategy and fit-out teams",
    serviceTypePhrase: "Architecture Photographer",
  },
  campaign: {
    ctaCopy:
      "Planning a campaign, lookbook, or brand shoot? Bright Line Photography creates editorial imagery for brands and agencies. Request availability to discuss your concept, timeline, and deliverables.",
    whoIsThisFor:
      "brands, agencies, creative directors, stylists, and marketing teams",
    serviceTypePhrase: "Campaign Photographer",
  },
  corporate: {
    ctaCopy:
      "Planning workplace imagery, executive portraits, or corporate branding? Bright Line Photography creates professional imagery for businesses and organizations. Request availability to discuss your timeline and deliverables.",
    whoIsThisFor:
      "office landlords, workplace teams, HR and communications, executives",
    serviceTypePhrase: "Corporate Photographer",
  },
};
