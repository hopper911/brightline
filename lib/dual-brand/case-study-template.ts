/**
 * Extensible Work case-study templates for Studio Hub.
 *
 * To add a template, append one CaseStudyTemplateDef to CASE_STUDY_TEMPLATES.
 * Hub pills, seed, checklist, category sync, and section AI all read from the registry.
 */

export const CASE_STUDY_SECTION_TYPES = [
  "text",
  "image",
  "gallery",
  "video",
  "quote",
  "metrics",
  "link",
  "prototype",
] as const;

export type CaseStudySectionType = (typeof CASE_STUDY_SECTION_TYPES)[number];

export type CaseStudySectionTone = "product" | "editorial" | "technical" | "concise";

export type CaseStudyTemplateShell = {
  type: CaseStudySectionType;
  title: string;
  /** Authoring hint shown in Studio Hub (not persisted as body). */
  hint: string;
};

export type CaseStudyChecklistGroup = {
  title: string;
  items: readonly string[];
};

export type CaseStudyTemplateDef = {
  id: string;
  label: string;
  category: string;
  defaultTone: CaseStudySectionTone;
  aiGuidance: string;
  checklist: readonly CaseStudyChecklistGroup[];
  sections: readonly CaseStudyTemplateShell[];
};

/**
 * Credibility + measurement rules — surface near the template seeder.
 */
export const CASE_STUDY_CREDIBILITY_NOTES = [
  "Add a visible concept disclaimer when a real company or product is referenced (self-initiated / sample data).",
  "Label performance numbers as proposed targets — never invent results or ROI.",
  "Usability observations are actual research findings; keep them separate from KPI targets.",
  "Show process without overwhelm: selected sketches, two routes, key feedback — not every draft.",
  "Use realistic content and clearly label sample / placeholder data.",
] as const;

/**
 * @deprecated Prefer checklist on each CASE_STUDY_TEMPLATES entry.
 */
export const CREATIVE_BRIEF_CHECKLIST = [
  "Business objective",
  "Target customer and customer insight",
  "Campaign proposition and message",
  "Required deliverables and channel specifications",
  "Launch schedule and review milestones",
  "Accessibility requirements",
  "Measurement plan (targets only)",
] as const;

const BASIC_SECTIONS: readonly CaseStudyTemplateShell[] = [
  {
    type: "text",
    title: "Overview and role",
    hint: "One-sentence business value; your role; concept disclaimer if needed.",
  },
  {
    type: "text",
    title: "Challenge",
    hint: "The problem and context in one concise paragraph — what was broken or missing.",
  },
  {
    type: "text",
    title: "Approach",
    hint: "Constraints, strategy, and how you worked — brief, not a process dump.",
  },
  {
    type: "gallery",
    title: "Process",
    hint: "Selected exploration only: sketches, routes, or key iterations with short captions.",
  },
  {
    type: "gallery",
    title: "Solution",
    hint: "Final experience / key screens or deliverables — desktop and mobile when relevant.",
  },
  {
    type: "text",
    title: "Outcome",
    hint: "What shipped or changed. No invented metrics — describe impact honestly.",
  },
  {
    type: "metrics",
    title: "Reflection",
    hint: "Optional Target: … metrics only when real or proposed. Body: what you learned and would test next.",
  },
];

const PRODUCT_UX_SECTIONS: readonly CaseStudyTemplateShell[] = [
  {
    type: "text",
    title: "Overview and role",
    hint: "One-sentence business value; your role and collaborators; concept disclaimer if needed.",
  },
  {
    type: "text",
    title: "Problem and users",
    hint: "One-sentence product problem; target users and context; what decision-makers vs users need.",
  },
  {
    type: "text",
    title: "Research and synthesis",
    hint: "Research method and limitations; synthesis and opportunity framing (honest scope).",
  },
  {
    type: "text",
    title: "Success criteria",
    hint: "How you would measure success — proposed criteria only; never invent live results.",
  },
  {
    type: "gallery",
    title: "Journey and concepts",
    hint: "Selected only: primary journey or service blueprint; competing concepts with selection rationale.",
  },
  {
    type: "gallery",
    title: "Iteration and prototype",
    hint: "Low-fidelity iteration (selected); short visual-system rationale; link/caption the clickable prototype (also set Live prototype URL).",
  },
  {
    type: "text",
    title: "Usability findings",
    hint: "Usability-test plan + actual observations and design changes. Findings ≠ KPI targets.",
  },
  {
    type: "gallery",
    title: "Execution quality",
    hint: "Responsive layouts; empty/loading/success/failure states; a11y/contrast; motion rationale; component variants — selected specs only.",
  },
  {
    type: "text",
    title: "Handoff notes",
    hint: "Developer annotations: behaviors, edge cases, tokens/variants — brief, shippable notes.",
  },
  {
    type: "metrics",
    title: "Target outcomes and reflection",
    hint: "Metrics: Target: … only (or Result: when real). Body: what you learned and would test next. Never invent performance.",
  },
];

const VISUAL_UI_SECTIONS: readonly CaseStudyTemplateShell[] = [
  {
    type: "text",
    title: "Overview and role",
    hint: "One-sentence business value; your role; concept disclaimer if a real company/product is referenced.",
  },
  {
    type: "text",
    title: "Business objective and audience",
    hint: "Business objective; decision-makers and users + what each needs; state the commercial/user problem in one concise paragraph.",
  },
  {
    type: "quote",
    title: "Customer insight",
    hint: "One guiding observation / insight that drove the concept (body = insight; optional attribution).",
  },
  {
    type: "text",
    title: "Creative strategy",
    hint: "Campaign proposition and message; list strategy, identity, UX, copy, photography, and production responsibilities honestly.",
  },
  {
    type: "gallery",
    title: "Concepts and iteration",
    hint: "Selected only: mood board + competitive scan; two early creative routes with selection rationale; sketches/wireframes/rejected; key review feedback → iteration.",
  },
  {
    type: "gallery",
    title: "Photography and design system",
    hint: "Photography plan, image selects, retouching decisions; typography, color, grid, components, templates, usage rules; include ≥1 detail/spec view.",
  },
  {
    type: "gallery",
    title: "Responsive experience",
    hint: "Desktop and mobile landing-page behavior — not only floating-device mockups.",
  },
  {
    type: "gallery",
    title: "Cross-channel applications",
    hint: "Idea working across channels relevant to the business; selected final production files across channels.",
  },
  {
    type: "text",
    title: "Accessibility and production decisions",
    hint: "Accessibility requirements; production decisions; deliverables, channel specs, launch schedule and review milestones — brief, not a dump.",
  },
  {
    type: "metrics",
    title: "Target outcomes and reflection",
    hint: "Metrics: label as Target (e.g. email CTR, LP conversion, PDP visits, ATC, video completion, social saves, guide downloads). Body: usability findings separately + what you learned and would test next. Never invent results.",
  },
];

/**
 * Ordered registry. Append a CaseStudyTemplateDef here to add a Hub template.
 */
export const CASE_STUDY_TEMPLATES: readonly CaseStudyTemplateDef[] = [
  {
    id: "basic",
    label: "Case study",
    category: "Case study",
    defaultTone: "editorial",
    aiGuidance:
      "Case study mode: Basic. Clear portfolio narrative — challenge, approach, selected process, solution, honest outcome. No process theater; never invent metrics; label sample data.",
    checklist: [
      {
        title: "Story",
        items: [
          "One-sentence business value",
          "Challenge and context",
          "Your role",
          "Approach in brief",
        ],
      },
      {
        title: "Process",
        items: [
          "Selected exploration only",
          "Final solution visuals",
          "Realistic / labeled sample data",
        ],
      },
      {
        title: "Presentation",
        items: [
          "Strong opening",
          "Value clear in 30 seconds",
          "No fabricated claims",
          "Reflection and next steps",
        ],
      },
    ],
    sections: BASIC_SECTIONS,
  },
  {
    id: "product_ux",
    label: "Product UX",
    category: "Product UX",
    defaultTone: "product",
    aiGuidance:
      "Case study mode: Product UX. Emphasize product problem, users, research limits, journey/decisions, usability findings, UI states (empty/loading/success/failure), accessibility, and handoff notes. Prefer decision narrative over decorative process theater.",
    checklist: [
      {
        title: "Story and strategy",
        items: [
          "One-sentence product problem",
          "Target users and context",
          "Your role and collaborators",
          "Research method and limitations",
          "Synthesis and opportunity framing",
          "Success criteria",
        ],
      },
      {
        title: "Design process",
        items: [
          "Primary journey or service blueprint",
          "Competing concepts",
          "Low-fidelity iteration",
          "Visual system rationale",
          "Clickable prototype",
          "Usability-test plan",
          "Observations and design changes",
        ],
      },
      {
        title: "Execution quality",
        items: [
          "Responsive layouts",
          "Empty, loading, success, and failure states",
          "Accessibility and contrast",
          "Motion or transition rationale",
          "Component variants",
          "Developer annotations",
          "Realistic content and clearly labeled sample data",
        ],
      },
      {
        title: "Final presentation",
        items: [
          "Strong opening visual",
          "Business value understandable in 30 seconds",
          "No unexplained process theater",
          "Clear ownership and no fabricated claims",
          "Results or measurable success criteria",
          "Reflection and next steps",
        ],
      },
    ],
    sections: PRODUCT_UX_SECTIONS,
  },
  {
    id: "visual_ui",
    label: "Visual UI",
    category: "Visual UI",
    defaultTone: "editorial",
    aiGuidance:
      "Case study mode: Visual UI / commercial craft. Emphasize campaign proposition, visual system, photography/design craft, responsive presentation, and cross-channel applications. Keep process selected and scannable.",
    checklist: [
      {
        title: "Story and strategy",
        items: [
          "Business objective",
          "Target customer and customer insight",
          "Campaign proposition and message",
          "Your role and collaborators",
          "Success criteria / measurement plan (targets only)",
        ],
      },
      {
        title: "Design process",
        items: [
          "Mood board + competitive scan (selected)",
          "Two early creative routes + selection rationale",
          "Photography plan / selects / retouch",
          "Desktop + mobile behavior",
          "Template and component logic",
          "Key review feedback → iteration",
        ],
      },
      {
        title: "Execution quality",
        items: [
          "Responsive layouts",
          "Accessibility and contrast",
          "Cross-channel production files (selected)",
          "Deliverables, channel specs, launch milestones (brief)",
          "Realistic content and clearly labeled sample data",
        ],
      },
      {
        title: "Final presentation",
        items: [
          "Strong opening visual",
          "Business value understandable in 30 seconds",
          "No unexplained process theater",
          "Clear ownership and no fabricated claims",
          "Labeled targets — never invented results",
          "Reflection and next steps",
        ],
      },
    ],
    sections: VISUAL_UI_SECTIONS,
  },
];

export const CASE_STUDY_MODES = CASE_STUDY_TEMPLATES.map((t) => t.id);
export type CaseStudyMode = (typeof CASE_STUDY_TEMPLATES)[number]["id"];

export const DEFAULT_CASE_STUDY_MODE: CaseStudyMode = "basic";

/** @deprecated Prefer getCaseStudyTemplate(mode).sections */
export const PRODUCT_UX_CASE_STUDY_TEMPLATE = PRODUCT_UX_SECTIONS;
/** @deprecated Prefer getCaseStudyTemplate(mode).sections */
export const VISUAL_UI_CASE_STUDY_TEMPLATE = VISUAL_UI_SECTIONS;
/** @deprecated Prefer getCaseStudyTemplate("basic").sections */
export const BASIC_CASE_STUDY_TEMPLATE = BASIC_SECTIONS;
/** @deprecated Alias — Visual UI is the former flagship commercial seed. */
export const FLAGSHIP_CASE_STUDY_TEMPLATE = VISUAL_UI_SECTIONS;

/** Thin accessors for Hub (derived from registry). */
export const CASE_STUDY_MODE_CATEGORY: Record<string, string> = Object.fromEntries(
  CASE_STUDY_TEMPLATES.map((t) => [t.id, t.category])
);

export const CASE_STUDY_PRODUCTION_CHECKLIST: Record<string, readonly CaseStudyChecklistGroup[]> =
  Object.fromEntries(CASE_STUDY_TEMPLATES.map((t) => [t.id, t.checklist]));

export type HubSectionDraft = {
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sortOrder: number;
  /** Optional authoring hint (not persisted to Mirotech). */
  hint?: string;
  /**
   * Ephemeral React list key (not persisted). Keeps focus stable when sections
   * reorder or the parent re-renders.
   */
  clientKey?: string;
};

export function getCaseStudyTemplate(mode: string): CaseStudyTemplateDef {
  const match = CASE_STUDY_TEMPLATES.find((t) => t.id === mode);
  return match ?? CASE_STUDY_TEMPLATES[0]!;
}

export function isCaseStudyMode(value: unknown): value is CaseStudyMode {
  return typeof value === "string" && CASE_STUDY_TEMPLATES.some((t) => t.id === value);
}

export function templateForCaseStudyMode(mode: CaseStudyMode | string): readonly CaseStudyTemplateShell[] {
  return getCaseStudyTemplate(mode).sections;
}

export function categoryForCaseStudyMode(mode: CaseStudyMode | string): string {
  return getCaseStudyTemplate(mode).category;
}

export function labelForCaseStudyMode(mode: CaseStudyMode | string): string {
  return getCaseStudyTemplate(mode).label;
}

export function checklistForCaseStudyMode(
  mode: CaseStudyMode | string
): readonly CaseStudyChecklistGroup[] {
  return getCaseStudyTemplate(mode).checklist;
}

export function aiGuidanceForCaseStudyMode(mode: CaseStudyMode | string): string {
  return getCaseStudyTemplate(mode).aiGuidance;
}

/** Match a persisted category (or id) to a template; default Basic. */
export function caseStudyModeFromCategories(
  categories: string[] | string | null | undefined
): CaseStudyMode {
  const list = Array.isArray(categories)
    ? categories
    : typeof categories === "string"
      ? categories.split(",").map((s) => s.trim())
      : [];
  const normalized = list.map((c) => c.trim().toLowerCase()).filter(Boolean);
  for (const template of CASE_STUDY_TEMPLATES) {
    const cat = template.category.toLowerCase();
    const id = template.id.toLowerCase();
    if (normalized.some((c) => c === cat || c === id || c === cat.replace(/\s+/g, "_"))) {
      return template.id;
    }
  }
  return DEFAULT_CASE_STUDY_MODE;
}

/** Upsert active template category; remove other registry category labels. */
export function syncCategoriesWithCaseStudyMode(
  categoriesCsvOrList: string | string[],
  mode: CaseStudyMode | string
): string[] {
  const list = Array.isArray(categoriesCsvOrList)
    ? categoriesCsvOrList.map((s) => s.trim()).filter(Boolean)
    : categoriesCsvOrList
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  const drop = new Set(CASE_STUDY_TEMPLATES.map((t) => t.category.toLowerCase()));
  const kept = list.filter((item) => !drop.has(item.toLowerCase()));
  return [categoryForCaseStudyMode(mode), ...kept];
}

export function defaultToneForCaseStudyMode(
  mode: CaseStudyMode | string
): CaseStudySectionTone {
  return getCaseStudyTemplate(mode).defaultTone;
}

/** Empty shells ready to paste/adapt in Studio Hub. */
export function seedCaseStudySections(
  mode: CaseStudyMode | string = DEFAULT_CASE_STUDY_MODE
): HubSectionDraft[] {
  return templateForCaseStudyMode(mode).map((shell, index) => ({
    type: shell.type,
    title: shell.title,
    body: "",
    data: {},
    sortOrder: index,
    hint: shell.hint,
    clientKey: `sec_${index}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
  }));
}

/** @deprecated Prefer seedCaseStudySections("visual_ui") or seedCaseStudySections("basic"). */
export function seedFlagshipCaseStudySections(): HubSectionDraft[] {
  return seedCaseStudySections("visual_ui");
}

/** Resolve authoring hint for a section title (seeded or matched across registry). */
export function hintForCaseStudySection(
  title: string,
  draftHint?: string,
  mode?: CaseStudyMode | string
): string {
  if (draftHint?.trim()) return draftHint.trim();
  const trimmed = title.trim();
  if (mode) {
    const match = templateForCaseStudyMode(mode).find((s) => s.title === trimmed);
    if (match) return match.hint;
  }
  for (const template of CASE_STUDY_TEMPLATES) {
    const match = template.sections.find((s) => s.title === trimmed);
    if (match) return match.hint;
  }
  return "";
}

export function extractPrototypeUrl(platforms: string[] | null | undefined): string {
  if (!Array.isArray(platforms)) return "";
  for (const item of platforms) {
    const value = String(item || "").trim();
    if (/^https?:\/\//i.test(value)) return value;
  }
  return "";
}

/** Trim and add https:// when the value looks like a host without a scheme. */
export function normalizePrototypeUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (/^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(value)) return `https://${value}`;
  return value;
}

export function isLivePrototypeUrl(raw: string): boolean {
  try {
    const parsed = new URL(normalizePrototypeUrl(raw));
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function prototypeDisplayHost(raw: string): string {
  if (!isLivePrototypeUrl(raw)) return "";
  try {
    return new URL(normalizePrototypeUrl(raw)).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

export type ImageSideType = "caption" | "quote";
export type ImageLayoutMode = "side" | "stack";
export type ImagePosition = "left" | "right";

export type NormalizedImageSideLayout = {
  sideType: ImageSideType;
  imagePosition: ImagePosition;
  layout: ImageLayoutMode;
  caption: string;
  quote: string;
  attribution: string;
  hasSideContent: boolean;
};

function asSideString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Normalize side-panel fields for Image sections and single-image Galleries. */
export function normalizeImageSideLayout(
  data: Record<string, unknown> | null | undefined
): NormalizedImageSideLayout {
  const row = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  const sideTypeRaw = asSideString(row.sideType).toLowerCase();
  const sideType: ImageSideType = sideTypeRaw === "quote" ? "quote" : "caption";
  const imagePositionRaw = asSideString(row.imagePosition).toLowerCase();
  const imagePosition: ImagePosition = imagePositionRaw === "right" ? "right" : "left";
  const caption = asSideString(row.caption);
  const quote = asSideString(row.quote);
  const attribution = asSideString(row.attribution);
  const hasSideContent = sideType === "quote" ? Boolean(quote) : Boolean(caption);
  const layoutRaw = asSideString(row.layout).toLowerCase();
  const layout: ImageLayoutMode =
    layoutRaw === "stack" ? "stack" : layoutRaw === "side" ? "side" : hasSideContent ? "side" : "stack";
  return {
    sideType,
    imagePosition,
    layout,
    caption,
    quote,
    attribution,
    hasSideContent,
  };
}

/** Gallery with one image: full-width unless side caption/quote is set. */
export function gallerySingleImageRenderMode(
  imageCount: number,
  data: Record<string, unknown> | null | undefined
): "full" | "side" | "grid" {
  if (imageCount <= 0) return "grid";
  if (imageCount === 1) {
    return normalizeImageSideLayout(data).hasSideContent ? "side" : "full";
  }
  return "grid";
}

/** Merge prototype URL into platforms (URL first; keep non-URL labels). */
export function mergePrototypeIntoPlatforms(
  platformsCsvOrList: string | string[],
  prototypeUrl: string
): string[] {
  const list = Array.isArray(platformsCsvOrList)
    ? platformsCsvOrList.map((s) => s.trim()).filter(Boolean)
    : platformsCsvOrList
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  const withoutUrls = list.filter((item) => !/^https?:\/\//i.test(item));
  const url = normalizePrototypeUrl(prototypeUrl);
  if (url && isLivePrototypeUrl(url)) return [url, ...withoutUrls];
  return withoutUrls;
}
