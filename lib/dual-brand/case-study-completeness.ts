/**
 * Live production-checklist scoring for Studio Hub case studies.
 * Maps each checklist label to a section/field requirement. Labels stay canonical.
 */

import {
  checklistForCaseStudyMode,
  isLivePrototypeUrl,
  templateForCaseStudyMode,
  type CaseStudyMode,
  type HubSectionDraft,
} from "@/lib/dual-brand/case-study-template";

export const MIN_BODY_CHARS = 80;

export type CompletenessRequirement =
  | "body"
  | "gallery"
  | "image"
  | "metrics"
  | "prototype"
  | "hero"
  | "disclaimer";

export type CompletenessRule = {
  item: string;
  sectionTitles: string[];
  requirement: CompletenessRequirement;
  /** Also match a section by type (e.g. prototype). */
  sectionType?: string;
};

export type CompletenessProjectFields = {
  prototypeUrl?: string | null;
  heroImage?: string | null;
  projectDisclaimer?: string | null;
};

export type CompletenessItemResult = {
  item: string;
  group: string;
  status: "done" | "missing";
  sectionIndex: number | null;
  sectionTitle: string | null;
  reason: string;
  requirement: CompletenessRequirement;
};

export type CompletenessReport = {
  items: CompletenessItemResult[];
  doneCount: number;
  totalCount: number;
};

type SectionLike = {
  type?: string | null;
  title?: string | null;
  body?: string | null;
  data?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function galleryImageCount(data: unknown): number {
  const raw = asRecord(data).images;
  if (!Array.isArray(raw)) return 0;
  return raw.filter((item) => {
    if (typeof item === "string") return Boolean(item.trim());
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const row = item as Record<string, unknown>;
      return Boolean(String(row.src || row.url || row.key || "").trim());
    }
    return false;
  }).length;
}

function imageSrc(data: unknown): string {
  const row = asRecord(data);
  return String(row.src || row.url || row.key || "").trim();
}

function metricCount(data: unknown): number {
  const row = asRecord(data);
  const raw = row.items ?? row.metrics;
  if (!Array.isArray(raw)) return 0;
  return raw.filter((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const rec = item as Record<string, unknown>;
    return Boolean(String(rec.label || rec.key || "").trim() || String(rec.value || "").trim());
  }).length;
}

const SAMPLE_RE = /\b(sample|placeholder|fictional|self-initiated|concept study|not a (third-party|client))\b/i;

export function mentionsSampleOrPlaceholder(...chunks: Array<string | null | undefined>): boolean {
  return chunks.some((chunk) => Boolean(chunk && SAMPLE_RE.test(chunk)));
}

function normTitle(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function findSectionIndex(
  sections: SectionLike[],
  titles: string[],
  sectionType?: string
): number {
  const wanted = new Set(titles.map(normTitle).filter(Boolean));
  if (sectionType) {
    const byType = sections.findIndex((s) => (s.type || "").toLowerCase() === sectionType);
    if (byType >= 0) return byType;
  }
  if (wanted.size === 0) return -1;
  return sections.findIndex((s) => wanted.has(normTitle(s.title)));
}

function bodyLen(section: SectionLike | undefined): number {
  return (section?.body || "").trim().length;
}

function requirementMet(
  requirement: CompletenessRequirement,
  section: SectionLike | undefined,
  fields: CompletenessProjectFields,
  allSections: SectionLike[]
): { ok: boolean; reason: string } {
  switch (requirement) {
    case "hero": {
      const hero = fields.heroImage?.trim() || "";
      return hero
        ? { ok: true, reason: "" }
        : { ok: false, reason: "No hero image on Project core." };
    }
    case "disclaimer": {
      const disclaimer = fields.projectDisclaimer?.trim() || "";
      const fromBodies = mentionsSampleOrPlaceholder(
        disclaimer,
        ...allSections.map((s) => s.body || "")
      );
      return fromBodies || disclaimer
        ? { ok: true, reason: "" }
        : { ok: false, reason: "Add a concept disclaimer or label sample / placeholder data." };
    }
    case "prototype": {
      const urlOk = isLivePrototypeUrl(fields.prototypeUrl || "");
      const hasBlock = allSections.some((s) => (s.type || "").toLowerCase() === "prototype");
      if (!urlOk) return { ok: false, reason: "No live prototype URL in Project core." };
      if (!hasBlock) return { ok: false, reason: "Insert a Live prototype section in the case study." };
      return { ok: true, reason: "" };
    }
    case "gallery": {
      if (!section) return { ok: false, reason: "Section missing." };
      const count = galleryImageCount(section.data);
      return count > 0
        ? { ok: true, reason: "" }
        : { ok: false, reason: "Gallery has no images." };
    }
    case "image": {
      if (!section) return { ok: false, reason: "Section missing." };
      return imageSrc(section.data)
        ? { ok: true, reason: "" }
        : { ok: false, reason: "No image attached." };
    }
    case "metrics": {
      if (!section) return { ok: false, reason: "Section missing." };
      if (metricCount(section.data) > 0 || bodyLen(section) >= MIN_BODY_CHARS) {
        return { ok: true, reason: "" };
      }
      return { ok: false, reason: "Add Target metrics or a reflection body." };
    }
    case "body":
    default: {
      if (!section) return { ok: false, reason: "Section missing." };
      return bodyLen(section) >= MIN_BODY_CHARS
        ? { ok: true, reason: "" }
        : { ok: false, reason: "Body is empty or too short." };
    }
  }
}

/** Per-mode rules. Every checklist label must appear exactly once. */
const RULES: Record<string, CompletenessRule[]> = {
  basic: [
    { item: "One-sentence business value", sectionTitles: ["Overview and role"], requirement: "body" },
    { item: "Challenge and context", sectionTitles: ["Challenge"], requirement: "body" },
    { item: "Your role", sectionTitles: ["Overview and role"], requirement: "body" },
    { item: "Approach in brief", sectionTitles: ["Approach"], requirement: "body" },
    { item: "Selected exploration only", sectionTitles: ["Process"], requirement: "gallery" },
    { item: "Final solution visuals", sectionTitles: ["Solution"], requirement: "gallery" },
    { item: "Realistic / labeled sample data", sectionTitles: [], requirement: "disclaimer" },
    { item: "Strong opening", sectionTitles: [], requirement: "hero" },
    { item: "Value clear in 30 seconds", sectionTitles: ["Overview and role"], requirement: "body" },
    { item: "No fabricated claims", sectionTitles: [], requirement: "disclaimer" },
    { item: "Reflection and next steps", sectionTitles: ["Reflection"], requirement: "metrics" },
  ],
  product_ux: [
    { item: "One-sentence product problem", sectionTitles: ["Problem and users"], requirement: "body" },
    { item: "Target users and context", sectionTitles: ["Problem and users"], requirement: "body" },
    { item: "Your role and collaborators", sectionTitles: ["Overview and role"], requirement: "body" },
    {
      item: "Research method and limitations",
      sectionTitles: ["Research and synthesis"],
      requirement: "body",
    },
    {
      item: "Synthesis and opportunity framing",
      sectionTitles: ["Research and synthesis"],
      requirement: "body",
    },
    { item: "Success criteria", sectionTitles: ["Success criteria"], requirement: "body" },
    {
      item: "Primary journey or service blueprint",
      sectionTitles: ["Journey and concepts"],
      requirement: "gallery",
    },
    { item: "Competing concepts", sectionTitles: ["Journey and concepts"], requirement: "gallery" },
    {
      item: "Low-fidelity iteration",
      sectionTitles: ["Iteration and prototype"],
      requirement: "gallery",
    },
    {
      item: "Visual system rationale",
      sectionTitles: ["Iteration and prototype"],
      requirement: "gallery",
    },
    {
      item: "Clickable prototype",
      sectionTitles: ["Iteration and prototype"],
      requirement: "prototype",
      sectionType: "prototype",
    },
    { item: "Usability-test plan", sectionTitles: ["Usability findings"], requirement: "body" },
    {
      item: "Observations and design changes",
      sectionTitles: ["Usability findings"],
      requirement: "body",
    },
    { item: "Responsive layouts", sectionTitles: ["Execution quality"], requirement: "gallery" },
    {
      item: "Empty, loading, success, and failure states",
      sectionTitles: ["Execution quality"],
      requirement: "gallery",
    },
    {
      item: "Accessibility and contrast",
      sectionTitles: ["Execution quality", "Handoff notes"],
      requirement: "gallery",
    },
    {
      item: "Motion or transition rationale",
      sectionTitles: ["Execution quality"],
      requirement: "gallery",
    },
    { item: "Component variants", sectionTitles: ["Execution quality"], requirement: "gallery" },
    { item: "Developer annotations", sectionTitles: ["Handoff notes"], requirement: "body" },
    { item: "Realistic content and clearly labeled sample data", sectionTitles: [], requirement: "disclaimer" },
    { item: "Strong opening visual", sectionTitles: [], requirement: "hero" },
    {
      item: "Business value understandable in 30 seconds",
      sectionTitles: ["Overview and role"],
      requirement: "body",
    },
    {
      item: "No unexplained process theater",
      sectionTitles: ["Journey and concepts", "Iteration and prototype"],
      requirement: "gallery",
    },
    { item: "Clear ownership and no fabricated claims", sectionTitles: [], requirement: "disclaimer" },
    {
      item: "Results or measurable success criteria",
      sectionTitles: ["Target outcomes and reflection", "Success criteria"],
      requirement: "metrics",
    },
    {
      item: "Reflection and next steps",
      sectionTitles: ["Target outcomes and reflection"],
      requirement: "metrics",
    },
  ],
  visual_ui: [
    {
      item: "Business objective",
      sectionTitles: ["Business objective and audience"],
      requirement: "body",
    },
    {
      item: "Target customer and customer insight",
      sectionTitles: ["Customer insight", "Business objective and audience"],
      requirement: "body",
    },
    {
      item: "Campaign proposition and message",
      sectionTitles: ["Creative strategy"],
      requirement: "body",
    },
    { item: "Your role and collaborators", sectionTitles: ["Overview and role"], requirement: "body" },
    {
      item: "Success criteria / measurement plan (targets only)",
      sectionTitles: ["Target outcomes and reflection"],
      requirement: "metrics",
    },
    {
      item: "Mood board + competitive scan (selected)",
      sectionTitles: ["Concepts and iteration"],
      requirement: "gallery",
    },
    {
      item: "Two early creative routes + selection rationale",
      sectionTitles: ["Concepts and iteration"],
      requirement: "gallery",
    },
    {
      item: "Photography plan / selects / retouch",
      sectionTitles: ["Photography and design system"],
      requirement: "gallery",
    },
    {
      item: "Desktop + mobile behavior",
      sectionTitles: ["Responsive experience"],
      requirement: "gallery",
    },
    {
      item: "Template and component logic",
      sectionTitles: ["Photography and design system"],
      requirement: "gallery",
    },
    {
      item: "Key review feedback → iteration",
      sectionTitles: ["Concepts and iteration"],
      requirement: "gallery",
    },
    { item: "Responsive layouts", sectionTitles: ["Responsive experience"], requirement: "gallery" },
    {
      item: "Accessibility and contrast",
      sectionTitles: ["Accessibility and production decisions"],
      requirement: "body",
    },
    {
      item: "Cross-channel production files (selected)",
      sectionTitles: ["Cross-channel applications"],
      requirement: "gallery",
    },
    {
      item: "Deliverables, channel specs, launch milestones (brief)",
      sectionTitles: ["Accessibility and production decisions"],
      requirement: "body",
    },
    { item: "Realistic content and clearly labeled sample data", sectionTitles: [], requirement: "disclaimer" },
    { item: "Strong opening visual", sectionTitles: [], requirement: "hero" },
    {
      item: "Business value understandable in 30 seconds",
      sectionTitles: ["Overview and role"],
      requirement: "body",
    },
    {
      item: "No unexplained process theater",
      sectionTitles: ["Concepts and iteration"],
      requirement: "gallery",
    },
    { item: "Clear ownership and no fabricated claims", sectionTitles: [], requirement: "disclaimer" },
    {
      item: "Labeled targets — never invented results",
      sectionTitles: ["Target outcomes and reflection"],
      requirement: "metrics",
    },
    {
      item: "Reflection and next steps",
      sectionTitles: ["Target outcomes and reflection"],
      requirement: "metrics",
    },
  ],
};

function rulesForMode(mode: string): CompletenessRule[] {
  return RULES[mode] || RULES.basic;
}

export function scoreCaseStudyCompleteness(
  mode: CaseStudyMode | string,
  sections: SectionLike[],
  fields: CompletenessProjectFields = {}
): CompletenessReport {
  const groups = checklistForCaseStudyMode(mode);
  const rules = rulesForMode(mode);
  const ruleByItem = new Map(rules.map((r) => [r.item, r]));
  const items: CompletenessItemResult[] = [];

  for (const group of groups) {
    for (const item of group.items) {
      const rule = ruleByItem.get(item);
      if (!rule) {
        items.push({
          item,
          group: group.title,
          status: "missing",
          sectionIndex: null,
          sectionTitle: null,
          reason: "No completeness rule mapped.",
          requirement: "body",
        });
        continue;
      }
      const candidates: number[] = [];
      if (rule.sectionType) {
        const byType = findSectionIndex(sections, [], rule.sectionType);
        if (byType >= 0) candidates.push(byType);
      }
      for (const title of rule.sectionTitles) {
        const idx = findSectionIndex(sections, [title]);
        if (idx >= 0 && !candidates.includes(idx)) candidates.push(idx);
      }
      let sectionIndex = candidates[0] ?? -1;
      let met = requirementMet(
        rule.requirement,
        sectionIndex >= 0 ? sections[sectionIndex] : undefined,
        fields,
        sections
      );
      for (const idx of candidates) {
        const next = requirementMet(rule.requirement, sections[idx], fields, sections);
        if (next.ok) {
          sectionIndex = idx;
          met = next;
          break;
        }
      }
      const section = sectionIndex >= 0 ? sections[sectionIndex] : undefined;
      const needsSection =
        rule.requirement !== "hero" &&
        rule.requirement !== "disclaimer" &&
        rule.requirement !== "prototype";
      const missingSection = needsSection && sectionIndex < 0;
      items.push({
        item,
        group: group.title,
        status: met.ok ? "done" : "missing",
        sectionIndex: sectionIndex >= 0 ? sectionIndex : null,
        sectionTitle: rule.sectionTitles[0] || section?.title || null,
        reason: missingSection
          ? `Section missing — add “${rule.sectionTitles[0] || item}”.`
          : met.reason,
        requirement: rule.requirement,
      });
    }
  }

  const doneCount = items.filter((i) => i.status === "done").length;
  return { items, doneCount, totalCount: items.length };
}

/** Seed a missing template shell for a checklist item (insert into the hub draft). */
export function shellForChecklistItem(
  mode: CaseStudyMode | string,
  item: CompletenessItemResult
): HubSectionDraft | null {
  const clientKey = `sec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  if (item.requirement === "prototype") {
    return {
      type: "prototype",
      title: "Live prototype",
      body: "",
      data: {},
      sortOrder: 0,
      clientKey,
    };
  }
  const title = item.sectionTitle?.trim();
  if (!title) return null;
  const template = templateForCaseStudyMode(mode).find((s) => s.title === title);
  return {
    type: template?.type || (item.requirement === "gallery" ? "gallery" : "text"),
    title,
    body: "",
    data: {},
    sortOrder: 0,
    hint: template?.hint,
    clientKey,
  };
}

export function compactSectionInventory(sections: SectionLike[]) {
  return sections.map((section, index) => ({
    index,
    type: section.type || "text",
    title: section.title || "",
    bodyChars: (section.body || "").trim().length,
    images: galleryImageCount(section.data),
    metrics: metricCount(section.data),
  }));
}
