import {
  defaultToneForCaseStudyMode as templateDefaultTone,
  type CaseStudyMode,
} from "@/lib/dual-brand/case-study-template";

export const SECTION_COPY_TONES = [
  "editorial",
  "product",
  "technical",
  "personal",
  "concise",
] as const;

export type SectionCopyTone = (typeof SECTION_COPY_TONES)[number];

export const SECTION_TONE_OPTIONS: ReadonlyArray<{ id: SectionCopyTone; label: string }> = [
  { id: "editorial", label: "Editorial" },
  { id: "product", label: "Product" },
  { id: "technical", label: "Technical" },
  { id: "personal", label: "Personal" },
  { id: "concise", label: "Concise" },
];

export const TONE_GUIDANCE: Record<SectionCopyTone, string> = {
  editorial:
    "Editorial: cinematic portfolio narrative; sensory and brand-aware; still specific to the section.",
  product:
    "Product: UX journey and decision-focused; signal → decision; clear product language without hype.",
  technical:
    "Technical: name concrete technologies, architecture, data flow, and implementation choices from context. Readable for hiring managers and clients — precise and approachable, not jargon soup. Do not invent stack claims.",
  personal:
    "Personal: sound like a real practitioner — warm, direct, human cadence. Use first person when natural (I/we). Specific observations over portfolio clichés. Still professional; no hype or emojis.",
  concise: "Concise: short portfolio blurb — 2–4 tight sentences max.",
};

const STORAGE_KEY = "studio-hub-ai-voice";

export function isSectionCopyTone(value: string): value is SectionCopyTone {
  return (SECTION_COPY_TONES as readonly string[]).includes(value);
}

export function normalizeSectionCopyTone(
  value: string | null | undefined,
  fallback: SectionCopyTone = "product"
): SectionCopyTone {
  const raw = value?.trim().toLowerCase() || "";
  return isSectionCopyTone(raw) ? raw : fallback;
}

export function defaultToneForCaseStudyMode(mode: CaseStudyMode | string): SectionCopyTone {
  return normalizeSectionCopyTone(templateDefaultTone(mode), "product");
}

export function readStoredAiVoice(): SectionCopyTone {
  if (typeof window === "undefined") return "product";
  try {
    return normalizeSectionCopyTone(window.localStorage.getItem(STORAGE_KEY), "product");
  } catch {
    return "product";
  }
}

export function writeStoredAiVoice(tone: SectionCopyTone): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, tone);
  } catch {
    /* ignore quota / private mode */
  }
}
