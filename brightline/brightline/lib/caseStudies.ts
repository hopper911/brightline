export type CaseStudy = {
  slug: string;
  title: string;
  client: string;
  industry: string;
  challenge: string[];
  approach: string[];
  result: string[];
  /** R2 keys or static paths for 6–10 images */
  imageKeys: string[];
  /** Optional hero key for card thumbnail */
  heroKey?: string;
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "maison-delmar-suite-launch",
    title: "Maison Delmar Suite Launch",
    client: "Maison Delmar",
    industry: "Architecture",
    challenge: [
      "Needed hero imagery for new suite category within 3 weeks of opening.",
      "Space had mixed natural light and required consistent tonal grading.",
    ],
    approach: [
      "Single-day capture with art direction aligned to brand guidelines.",
      "Post-production delivered web, social, and print crops in one pass.",
    ],
    result: [
      "Suites booked within two weeks of imagery going live.",
    ],
    imageKeys: ["/images/hero.jpg", "/images/hospitality.jpg", "/images/design.jpg"],
    heroKey: "/images/hero.jpg",
  },
  {
    slug: "meridian-campaign",
    title: "Meridian Studio Campaign",
    client: "Meridian Studio",
    industry: "Campaign & Advertising",
    challenge: [
      "Campaign needed to feel elevated and travel across digital and print.",
      "Tight timeline with multiple looks in one location.",
    ],
    approach: [
      "Pre-production storyboard and shot list to maximize capture day.",
      "On-set styling and direction for consistent visual narrative.",
    ],
    result: [
      "Campaign launched on schedule with assets ready for all channels.",
    ],
    imageKeys: ["/images/design.jpg", "/images/fashion.jpg", "/images/hero.jpg"],
    heroKey: "/images/design.jpg",
  },
  {
    slug: "atlas-square-offices",
    title: "Atlas Square Offices",
    client: "Atlas Square",
    industry: "Corporate & Professional",
    challenge: [
      "Corporate real estate needed imagery for leasing and marketing.",
      "Spaces were in use; required efficient capture windows.",
    ],
    approach: [
      "Coordinated with facilities for early-morning access.",
      "Delivered consistent color and crops for web and print brochures.",
    ],
    result: [
      "Full library delivered in 10 days; used across leasing materials.",
    ],
    imageKeys: ["/images/design.jpg", "/images/hero.jpg"],
    heroKey: "/images/design.jpg",
  },
];

export function getCaseStudyBySlug(slug: string): CaseStudy | null {
  return CASE_STUDIES.find((c) => c.slug === slug) ?? null;
}
