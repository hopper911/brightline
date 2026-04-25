/** Editorial narrative blocks (premium portfolio case study). */
export type CaseStudyEditorial = {
  location?: string;
  year?: number;
  opening: string;
  context: string;
  approach: string;
  highlightLine: string;
  execution?: string;
  closing: string;
};

export type CaseStudy = {
  slug: string;
  title: string;
  client: string;
  industry: string;
  /** Bullet layout (legacy case studies). Omit when `editorial` is set. */
  challenge?: string[];
  approach?: string[];
  result?: string[];
  /** Narrative layout — when set, detail page uses editorial sections. */
  editorial?: CaseStudyEditorial;
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
      "Structured handoff: web, social, and print crops with organized naming in one pass.",
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
    industry: "Advertising",
    challenge: [
      "Campaign needed to feel elevated and travel across digital and print.",
      "Tight timeline with multiple looks in one location.",
    ],
    approach: [
      "Pre-production storyboard and shot list to maximize capture day.",
      "On-set direction plus structured delivery so assets shipped ready for digital and print.",
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
      "Consistent color, crops, and metadata for web, listings, and print brochures.",
    ],
    result: [
      "Full library delivered in 10 days; used across leasing materials.",
    ],
    imageKeys: ["/images/design.jpg", "/images/hero.jpg"],
    heroKey: "/images/design.jpg",
  },
  {
    slug: "anne-bowen",
    title: "Anne Bowen",
    client: "Anne Bowen",
    industry: "Fashion / Editorial",
    editorial: {
      location: "New York, NY",
      year: 2024,
      opening:
        "Anne Bowen is a luxury womenswear label carried at Bergdorf Goodman, Saks Fifth Avenue, and Neiman Marcus — with a red carpet presence spanning the Academy Awards, the Golden Globes, and Cannes. This shoot was commissioned to document her latest collection for social media and editorial placement.",
      context:
        "Bowen's designs are defined by clean silhouettes, rich draping, and the weight of semi-precious and precious stone detailing. The work required imagery that honored that restraint — letting structure and surface speak without visual noise.",
      approach:
        "The approach was editorial and controlled. Lighting was kept deliberate to emphasize silhouette and texture — the qualities that define Bowen's design language. The framing prioritized the garment as the subject, with the model as its context.",
      highlightLine: "Confidence doesn't announce itself.",
      execution:
        "Post-production followed the tone of the brand: refined, high-contrast, and restrained. Retouching preserved the integrity of the fabrication and stone work, avoiding over-processing that would flatten the tactile quality of the pieces.",
      closing:
        "The final images were delivered for both social and editorial use — built to hold up in either context.",
    },
    imageKeys: ["/images/case-studies/anne-bowen.png"],
    heroKey: "/images/case-studies/anne-bowen.png",
  },
];

export function getCaseStudyBySlug(slug: string): CaseStudy | null {
  return CASE_STUDIES.find((c) => c.slug === slug) ?? null;
}
