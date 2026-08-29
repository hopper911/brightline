/**
 * Apply Mirotech case study templates on create and validate against structure.
 */

import type { MirotechCaseStudyCompletenessInput } from "@/lib/platform/projects/completeness/mirotech-case-study";
import {
  buildMirotechTemplateSectionPayload,
  getMirotechCaseStudyTemplateDef,
  type MirotechCaseStudyTemplateDef,
} from "@/lib/platform/projects/mirotech-template-definitions";

export type MirotechTemplateValidationInput = MirotechCaseStudyCompletenessInput & {
  role?: string | null;
  projectDisclaimer?: string | null;
  sectionTitles?: string[];
  tools?: string[];
  categories?: string[];
};

export type MirotechTemplateValidationResult = {
  templateId: string;
  templateLabel: string;
  passed: boolean;
  missingFields: string[];
  missingMedia: string[];
  missingSections: string[];
  warnings: string[];
};

export function resolveMirotechTemplateId(templateId: string | null | undefined): string | null {
  if (!templateId?.trim()) return null;
  const def = getMirotechCaseStudyTemplateDef(templateId.trim());
  return def?.id ?? null;
}

export function buildMirotechCreatePayloadFromTemplate(
  def: MirotechCaseStudyTemplateDef,
  base: Record<string, unknown>,
  draftOverlay?: {
    summary?: string;
    role?: string;
    challenge?: string;
    outcome?: string;
    projectDisclaimer?: string;
    sections?: Array<{ title: string; body: string }>;
  }
): Record<string, unknown> {
  const sections = buildMirotechTemplateSectionPayload(def).map((section, index) => {
    if (!draftOverlay?.sections?.length) return section;
    const match = draftOverlay.sections.find(
      (item) => item.title.trim().toLowerCase() === section.title.trim().toLowerCase()
    );
    if (!match?.body?.trim()) return section;
    return { ...section, body: match.body.trim() };
  });

  const payload: Record<string, unknown> = {
    ...def.defaults,
    ...base,
    sections,
  };

  if (draftOverlay?.summary?.trim()) payload.summary = draftOverlay.summary.trim();
  if (draftOverlay?.role?.trim()) payload.role = draftOverlay.role.trim();
  if (draftOverlay?.challenge?.trim()) payload.challenge = draftOverlay.challenge.trim();
  if (draftOverlay?.outcome?.trim()) payload.outcome = draftOverlay.outcome.trim();
  if (draftOverlay?.projectDisclaimer?.trim()) {
    payload.projectDisclaimer = draftOverlay.projectDisclaimer.trim();
  }

  delete payload.pillarSlug;
  delete payload.section;

  return payload;
}

function fieldValueForKey(
  input: MirotechTemplateValidationInput,
  key: string
): string | null | undefined {
  switch (key) {
    case "summary":
      return input.summary;
    case "role":
      return input.role;
    case "challenge":
      return input.challenge;
    case "outcome":
      return input.outcome;
    case "projectDisclaimer":
      return input.projectDisclaimer;
    default:
      return undefined;
  }
}

function mediaValueForKey(
  input: MirotechTemplateValidationInput,
  key: string
): string | null | undefined {
  switch (key) {
    case "heroImage":
      return input.heroImage;
    case "thumbnailImage":
      return input.thumbnailImage;
    case "backgroundMedia":
      return null;
    default:
      return undefined;
  }
}

export function validateMirotechCaseStudyAgainstTemplate(
  templateId: string,
  input: MirotechTemplateValidationInput
): MirotechTemplateValidationResult | null {
  const def = getMirotechCaseStudyTemplateDef(templateId);
  if (!def) return null;

  const missingFields: string[] = [];
  const missingMedia: string[] = [];
  const missingSections: string[] = [];
  const warnings: string[] = [];

  for (const field of def.coreFields) {
    if (!field.required) continue;
    const value = fieldValueForKey(input, field.key);
    if (!value?.trim()) {
      missingFields.push(field.label);
    }
  }

  for (const slot of def.mediaSlots) {
    if (!slot.required) continue;
    const value = mediaValueForKey(input, slot.key);
    if (!value?.trim()) {
      missingMedia.push(slot.label);
    }
  }

  const existingTitles = new Set(
    (input.sectionTitles ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean)
  );
  for (const section of def.sections) {
    if (!existingTitles.has(section.title.trim().toLowerCase())) {
      missingSections.push(section.title);
    }
  }

  if (
    def.coreFields.some((f) => f.key === "projectDisclaimer") &&
    !input.projectDisclaimer?.trim()
  ) {
    warnings.push(
      "Add a concept disclaimer when referencing a real company or product as self-initiated / sample data."
    );
  }

  const passed =
    missingFields.length === 0 && missingMedia.length === 0 && missingSections.length === 0;

  return {
    templateId: def.id,
    templateLabel: def.label,
    passed,
    missingFields,
    missingMedia,
    missingSections,
    warnings,
  };
}

export function templateStructureSummary(def: MirotechCaseStudyTemplateDef) {
  return {
    coreFields: def.coreFields,
    sections: def.sections,
    mediaSlots: def.mediaSlots,
    seo: def.seo,
    technologyCategories: def.technologyCategories,
    aiDraft: { enabled: def.aiDraft.enabled },
  };
}
