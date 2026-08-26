export type DesignCaseStudySectionKey =
  | "overview"
  | "context"
  | "research"
  | "goals"
  | "responsibilities"
  | "existingWorkflow"
  | "informationArchitecture"
  | "userFlows"
  | "wireframes"
  | "designSystem"
  | "features"
  | "technicalApproach"
  | "challenges"
  | "outcomes"
  | "nextSteps";

export type DesignCaseStudy = Partial<Record<DesignCaseStudySectionKey, string | string[]>>;

export const DESIGN_CASE_STUDY_SECTION_ORDER: DesignCaseStudySectionKey[] = [
  "overview",
  "context",
  "research",
  "goals",
  "responsibilities",
  "existingWorkflow",
  "informationArchitecture",
  "userFlows",
  "wireframes",
  "designSystem",
  "features",
  "technicalApproach",
  "challenges",
  "outcomes",
  "nextSteps",
];

export const DESIGN_CASE_STUDY_SECTION_LABEL: Record<DesignCaseStudySectionKey, string> = {
  overview: "Overview",
  context: "Context",
  research: "Research",
  goals: "Goals",
  responsibilities: "My role",
  existingWorkflow: "Existing workflow",
  informationArchitecture: "Information architecture",
  userFlows: "User flows",
  wireframes: "Wireframes",
  designSystem: "Design system",
  features: "Key features",
  technicalApproach: "Technical approach",
  challenges: "Challenges and decisions",
  outcomes: "Outcome",
  nextSteps: "Next steps",
};

/** Strip admin-only TODO markers from public rendering. */
export function scrubPublicCaseStudyText(value: string): string {
  return value
    .split("\n")
    .filter((line) => !/^\s*TODO\b/i.test(line.trim()))
    .join("\n")
    .replace(/\[TODO:[^\]]*\]/gi, "")
    .trim();
}

export function normalizeCaseStudy(input: unknown): DesignCaseStudy {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const src = input as Record<string, unknown>;
  const out: DesignCaseStudy = {};
  for (const key of DESIGN_CASE_STUDY_SECTION_ORDER) {
    const raw = src[key];
    if (typeof raw === "string") {
      const cleaned = scrubPublicCaseStudyText(raw);
      if (cleaned) out[key] = cleaned;
    } else if (Array.isArray(raw)) {
      const items = raw
        .filter((item): item is string => typeof item === "string")
        .map(scrubPublicCaseStudyText)
        .filter(Boolean);
      if (items.length) out[key] = items;
    }
  }
  return out;
}

export function caseStudyHasContent(caseStudy: DesignCaseStudy): boolean {
  return DESIGN_CASE_STUDY_SECTION_ORDER.some((key) => {
    const v = caseStudy[key];
    if (typeof v === "string") return Boolean(v.trim());
    if (Array.isArray(v)) return v.length > 0;
    return false;
  });
}
