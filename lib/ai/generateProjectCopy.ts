import OpenAI, { APIError } from "openai";
import { PROJECT_COPY_EDITORIAL, PROJECT_COPY_REPAIR_ALL_FIELDS } from "@/lib/ai/prompts";
import { runAiChatCompletion } from "@/lib/ai/ops";
import { createOpenAiClient } from "@/lib/ai/runtime";

export const PROJECT_COPY_FIELD_KEYS = [
  "opening",
  "context",
  "approach",
  "highlightLine",
  "execution",
  "closing",
  "credits",
  "projectTags",
  "client",
  "projectTypeLegacy",
  "scope",
  "overviewExtended",
  "whatWasPhotographed",
  "visualApproachLegacy",
  "locationContext",
  "whoThisPhotographyServes",
  "seoTitle",
  "metaDescription",
  "ctaCopy",
  /** Listing / card teaser on /work index; distinct from long-form case study opening. */
  "summary",
  /** Optional longer body for project page / cards. */
  "description",
] as const;

export type ProjectCopyFieldKey = (typeof PROJECT_COPY_FIELD_KEYS)[number];

/** Brief form keys populated by `all_fields` Generate All (text fields only; pillar/desiredStyle stay user-selected). */
export const GENERATE_ALL_BRIEF_KEYS = [
  "clientName",
  "projectTitle",
  "projectType",
  "shootType",
  "location",
  "whatWasPhotographed",
  "visualApproach",
  "targetAudience",
  "projectGoal",
  "notes",
] as const;

export type GenerateAllBriefKey = (typeof GENERATE_ALL_BRIEF_KEYS)[number];

export type ProjectCopyBrief = {
  clientName?: string;
  projectTitle?: string;
  projectType?: string;
  pillar?: string;
  shootType?: string;
  location?: string;
  whatWasPhotographed?: string;
  visualApproach?: string;
  targetAudience?: string;
  projectGoal?: string;
  notes?: string;
  desiredStyle?: string;
};

export type ProjectCopyValues = Partial<Record<ProjectCopyFieldKey, string>>;
export type ProjectCopyTonePreset =
  | "Quiet luxury"
  | "Minimal"
  | "Editorial"
  | "Commercial"
  | "SEO-focused"
  | "Warm client-friendly"
  | "Corporate strategic"
  | "More concise"
  | "More polished"
  | "More direct";

const TONE_PRESETS = new Set<string>([
  "Quiet luxury",
  "Minimal",
  "Editorial",
  "Commercial",
  "SEO-focused",
  "Warm client-friendly",
  "Corporate strategic",
  "More concise",
  "More polished",
  "More direct",
]);

export type ProjectCopyRequest =
  | {
      projectId?: string;
      mode: "single_field";
      fieldKey: ProjectCopyFieldKey;
      brief: ProjectCopyBrief;
      existingValues: ProjectCopyValues;
      tonePreset?: ProjectCopyTonePreset;
    }
  | {
      projectId?: string;
      mode: "all_fields";
      brief: ProjectCopyBrief;
      existingValues: ProjectCopyValues;
      tonePreset?: ProjectCopyTonePreset;
    }
  | {
      projectId?: string;
      mode: "rewrite_field";
      fieldKey: ProjectCopyFieldKey;
      brief: ProjectCopyBrief;
      existingValues: ProjectCopyValues;
      sourceText: string;
      tonePreset?: ProjectCopyTonePreset;
    }
  | {
      projectId?: string;
      mode: "brief_case_study";
      brief: ProjectCopyBrief;
      existingValues: ProjectCopyValues;
      sourceText: string;
      tonePreset?: ProjectCopyTonePreset;
    };

const FIELD_SET = new Set<string>(PROJECT_COPY_FIELD_KEYS);

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function cleanRecord(raw: unknown, keys: readonly string[]) {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const obj = raw as Record<string, unknown>;
  for (const key of keys) {
    const value = cleanString(obj[key]);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function normalizeGeneratedValue(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean).join(", ");
  return String(value).trim();
}

function enforceLength(fieldKey: ProjectCopyFieldKey, value: string) {
  const maxByField: Partial<Record<ProjectCopyFieldKey, number>> = {
    seoTitle: 60,
    metaDescription: 170,
    highlightLine: 220,
    ctaCopy: 160,
    projectTags: 260,
    client: 120,
    projectTypeLegacy: 120,
    scope: 180,
    summary: 420,
    description: 4000,
  };
  const max = maxByField[fieldKey];
  if (!max || value.length <= max) return value;
  return value.slice(0, max - 1).trimEnd();
}

export function parseProjectCopyRequest(body: unknown):
  | { ok: true; data: ProjectCopyRequest }
  | { ok: false; status: number; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "Request body must be a JSON object." };
  }

  const obj = body as Record<string, unknown>;
  const mode = obj.mode;
  if (mode !== "single_field" && mode !== "all_fields" && mode !== "rewrite_field" && mode !== "brief_case_study") {
    return { ok: false, status: 400, error: "mode must be single_field, all_fields, rewrite_field, or brief_case_study." };
  }

  const brief = cleanRecord(obj.brief, [
    "clientName",
    "projectTitle",
    "projectType",
    "pillar",
    "shootType",
    "location",
    "whatWasPhotographed",
    "visualApproach",
    "targetAudience",
    "projectGoal",
    "notes",
    "desiredStyle",
  ]) as ProjectCopyBrief;

  const existingValues = cleanRecord(obj.existingValues, PROJECT_COPY_FIELD_KEYS) as ProjectCopyValues;
  const projectId = cleanString(obj.projectId);
  const rawTonePreset = cleanString(obj.tonePreset);
  const tonePreset = rawTonePreset && TONE_PRESETS.has(rawTonePreset) ? rawTonePreset as ProjectCopyTonePreset : undefined;

  if (mode === "brief_case_study") {
    const sourceText = cleanString(obj.sourceText);
    if (!sourceText) {
      return { ok: false, status: 400, error: "sourceText is required for brief_case_study mode." };
    }
    return {
      ok: true,
      data: {
        ...(projectId ? { projectId } : {}),
        mode,
        brief,
        existingValues,
        sourceText,
        ...(tonePreset ? { tonePreset } : {}),
      },
    };
  }

  if (mode === "single_field" || mode === "rewrite_field") {
    const fieldKey = cleanString(obj.fieldKey);
    if (!fieldKey || !FIELD_SET.has(fieldKey)) {
      return { ok: false, status: 400, error: "fieldKey is required for single_field and rewrite_field mode." };
    }
    const sourceText = cleanString(obj.sourceText);
    if (mode === "rewrite_field" && !sourceText) {
      return { ok: false, status: 400, error: "sourceText is required for rewrite_field mode." };
    }
    if (mode === "rewrite_field") {
      return {
        ok: true,
        data: {
          ...(projectId ? { projectId } : {}),
          mode,
          fieldKey: fieldKey as ProjectCopyFieldKey,
          brief,
          existingValues,
          sourceText: sourceText as string,
          ...(tonePreset ? { tonePreset } : {}),
        },
      };
    }
    return {
      ok: true,
      data: {
        ...(projectId ? { projectId } : {}),
        mode,
        fieldKey: fieldKey as ProjectCopyFieldKey,
        brief,
        existingValues,
        ...(tonePreset ? { tonePreset } : {}),
      },
    };
  }

  return {
    ok: true,
    data: {
      ...(projectId ? { projectId } : {}),
      mode,
      brief,
      existingValues,
      ...(tonePreset ? { tonePreset } : {}),
    },
  };
}

const FIELD_INSTRUCTIONS: Record<ProjectCopyFieldKey, string> = {
  opening: "2-3 lines max. State client, project type, and why the work matters.",
  context: "One short paragraph explaining the setting, goal, challenge, or purpose of the shoot.",
  approach:
    "Short paragraph or bullet-style copy about lighting, composition, direction, styling, sequencing, mood, or production approach.",
  highlightLine: "One strong sentence that can work as a pull quote or project summary.",
  execution:
    "One or two sentences on technique, color, retouching, production rhythm, deliverables, or how selects support client use.",
  closing: "One clean closing line connecting the project to the client's brand, space, campaign, or audience.",
  credits:
    "Short honest credit line. If specifics unknown: Photography by Bright Line or Photography and creative direction by Bright Line.",
  projectTags: "Comma-separated tags: include pillar, shoot type, subject, location if available, and use-case.",
  client: "Use the provided client name.",
  projectTypeLegacy:
    "Short project type, e.g. Editorial Campaign, Office Renovation, Product Collection Shoot, Corporate Portrait Session.",
  scope: "Short phrase explaining the scope.",
  overviewExtended: "Second paragraph style summary. Descriptive but polished.",
  whatWasPhotographed: "Plain description of the subjects photographed.",
  visualApproachLegacy: "Describe visual style, lighting, composition, mood, color, framing, and pacing.",
  locationContext: "Describe the location or setting if available. If unavailable, keep it general.",
  whoThisPhotographyServes:
    "Describe target audience or business use: creative directors, brand teams, developers, architects, brokers, founders, executives, marketing teams, hospitality groups.",
  seoTitle: "SEO-friendly title under 60 characters when possible.",
  metaDescription: "SEO meta description around 140-160 characters. Clear, professional, not keyword-stuffed.",
  ctaCopy: "Short call-to-action for the project page.",
  summary:
    "Short listing summary for /work grids and section pages: 1–3 crisp sentences. Tease the project; avoid repeating the full case study. No markdown.",
  description:
    "Optional longer intro or body copy for the project (detail page / expanded card). 2–4 tight paragraphs when useful; editorial and specific. Do not duplicate the summary verbatim—add context, subjects, or use-case.",
};

const BRIEF_PATCH_INSTRUCTIONS: Record<GenerateAllBriefKey, string> = {
  clientName: "Client or brand name; concise.",
  projectTitle: "Project title as used internally / on the page.",
  projectType: "e.g. Editorial campaign, Brand refresh, Launch assets.",
  shootType: "e.g. Lifestyle, studio product, workplace, portraits, location editorial.",
  location: "City, region, or studio as appropriate.",
  whatWasPhotographed: "Concrete list or paragraph of subjects, scenes, and hero subjects.",
  visualApproach: "Tone, lighting, palette, pacing, styling direction.",
  targetAudience: "Who uses the images: roles, teams, channels.",
  projectGoal: "Why the work exists: launch, library, pitch, social, OOH, etc.",
  notes:
    "Short synthesized brief recap (goals, constraints, standout directions); not duplicate of other brief keys.",
};

const TONE_INSTRUCTIONS: Record<ProjectCopyTonePreset, string> = {
  "Quiet luxury": "Restrained, premium, calm, precise, and elegant. Avoid hype and over-selling.",
  Minimal: "Sparse, clean, and direct. Use fewer words while keeping the meaning intact.",
  Editorial: "Polished magazine-style language with a confident photographic point of view.",
  Commercial: "Clear business-facing copy that connects the imagery to marketing, sales, launch, or brand use.",
  "SEO-focused": "Naturally include useful search context without stuffing keywords or sounding mechanical.",
  "Warm client-friendly": "Approachable, clear, and helpful while still polished and professional.",
  "Corporate strategic": "Executive-ready, strategic, precise, and useful for business stakeholders.",
  "More concise": "Shorten and tighten the copy. Remove filler while preserving the core meaning.",
  "More polished": "Refine clarity, rhythm, specificity, and Bright Line brand voice.",
  "More direct": "Make the copy more straightforward, active, and easy to understand.",
};

function buildPrompt(input: ProjectCopyRequest) {
  const requestedFields =
    input.mode === "single_field" || input.mode === "rewrite_field"
      ? [input.fieldKey]
      : input.mode === "brief_case_study"
        ? ["opening", "context", "approach", "highlightLine", "execution", "closing", "projectTags", "seoTitle", "metaDescription", "ctaCopy"] as ProjectCopyFieldKey[]
        : PROJECT_COPY_FIELD_KEYS;
  return JSON.stringify(
    {
      task:
        input.mode === "brief_case_study"
          ? "Turn rough project notes into a polished Bright Line case study draft."
          : input.mode === "rewrite_field"
          ? "Rewrite existing copy for one editable project field."
          : input.mode === "single_field"
          ? "Generate copy for one editable project field."
          : "Generate complete copy for every CMS project field AND complete AI Brief helper fields (brief object). Both objects must be fully populated.",
      responseShape:
        input.mode === "single_field" || input.mode === "rewrite_field"
          ? { fieldKey: input.fieldKey, value: "Generated text here" }
          : input.mode === "brief_case_study"
            ? {
                values: Object.fromEntries(requestedFields.map((key) => [key, ""])),
                imageDirectionNotes: "",
                suggestedPlacement: "",
              }
            : {
                values: Object.fromEntries(PROJECT_COPY_FIELD_KEYS.map((key) => [key, ""])),
                brief: Object.fromEntries(GENERATE_ALL_BRIEF_KEYS.map((key) => [key, ""])),
              },
      ...(input.mode === "all_fields"
        ? {
            mandatoryNonEmptyAllFields: true,
            briefFieldInstructions: Object.fromEntries(
              GENERATE_ALL_BRIEF_KEYS.map((key) => [key, BRIEF_PATCH_INSTRUCTIONS[key]])
            ),
          }
        : {}),
      brief: input.brief,
      existingValues: input.existingValues,
      sourceText: input.mode === "rewrite_field" || input.mode === "brief_case_study" ? input.sourceText : undefined,
      tonePreset: input.tonePreset,
      toneInstruction: input.tonePreset ? TONE_INSTRUCTIONS[input.tonePreset] : undefined,
      requestedFields,
      fieldInstructions: Object.fromEntries(
        requestedFields.map((fieldKey) => [fieldKey, FIELD_INSTRUCTIONS[fieldKey]])
      ),
      styleRules: {
        serviceArea: "New Jersey and the New York metro when geography is useful.",
        ifMissingInfo: "Make a tasteful professional assumption, but do not invent specific facts.",
        credits:
          input.mode === "all_fields"
            ? "Always output a short honest credits line (see credits field instruction). Never leave credits empty."
            : "Return empty string if no real credit information is provided.",
        rewrite: "For rewrite_field mode, preserve the meaning and facts of sourceText. Improve clarity and Bright Line brand voice.",
        briefCaseStudy:
          "For brief_case_study mode, use sourceText as the rough notes. Produce a complete, specific, premium editorial case study draft. Do not invent specific facts beyond tasteful general framing.",
        ...(input.mode === "all_fields"
          ? {
              allFieldsMandatory:
                "Return JSON with top-level keys values and brief. Every key listed under values in responseShape MUST be non-empty substantive copy. Every key listed under brief in responseShape MUST be non-empty. Pillar and desired copy style are chosen separately in the CMS—omit them from brief output.",
            }
          : {}),
      },
    },
    null,
    2
  );
}

function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model returned invalid JSON.");
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

function normalizeSingleResponse(raw: Record<string, unknown>, fieldKey: ProjectCopyFieldKey) {
  const returnedField = cleanString(raw.fieldKey);
  const value = enforceLength(fieldKey, normalizeGeneratedValue(raw.value));
  return { fieldKey: (returnedField && FIELD_SET.has(returnedField) ? returnedField : fieldKey) as ProjectCopyFieldKey, value };
}

function normalizeAllResponse(raw: Record<string, unknown>) {
  const rawValues =
    raw.values && typeof raw.values === "object" && !Array.isArray(raw.values)
      ? (raw.values as Record<string, unknown>)
      : raw;
  const values: ProjectCopyValues = {};
  for (const fieldKey of PROJECT_COPY_FIELD_KEYS) {
    values[fieldKey] = enforceLength(fieldKey, normalizeGeneratedValue(rawValues[fieldKey]));
  }
  return { values };
}

function normalizeBriefPatch(raw: Record<string, unknown>): Record<GenerateAllBriefKey, string> {
  const briefRaw =
    raw.brief && typeof raw.brief === "object" && !Array.isArray(raw.brief)
      ? (raw.brief as Record<string, unknown>)
      : {};
  const out = {} as Record<GenerateAllBriefKey, string>;
  for (const key of GENERATE_ALL_BRIEF_KEYS) {
    out[key] = normalizeGeneratedValue(briefRaw[key]).trim();
  }
  return out;
}

function normalizeAllFieldsBundle(raw: Record<string, unknown>) {
  const { values } = normalizeAllResponse(raw);
  const brief = normalizeBriefPatch(raw);
  return { values, brief };
}

function buildRepairPrompt(
  input: Extract<ProjectCopyRequest, { mode: "all_fields" }>,
  missingCopy: ProjectCopyFieldKey[],
  missingBrief: GenerateAllBriefKey[],
  values: ProjectCopyValues,
  brief: Record<GenerateAllBriefKey, string>
) {
  return JSON.stringify(
    {
      task: "Repair pass: fill ONLY the listed missing keys. Every filled key MUST be non-empty substantive text.",
      missingValuesKeys: missingCopy,
      missingBriefKeys: missingBrief,
      briefContext: input.brief,
      existingValuesSnapshot: values,
      briefOutputsSnapshot: brief,
      tonePreset: input.tonePreset,
      toneInstruction: input.tonePreset ? TONE_INSTRUCTIONS[input.tonePreset] : undefined,
      responseShape: {
        values: Object.fromEntries(missingCopy.map((key) => [key, ""])),
        brief: Object.fromEntries(missingBrief.map((key) => [key, ""])),
      },
      fieldInstructions: Object.fromEntries(missingCopy.map((key) => [key, FIELD_INSTRUCTIONS[key]])),
      briefFieldInstructions: Object.fromEntries(
        missingBrief.map((key) => [key, BRIEF_PATCH_INSTRUCTIONS[key]])
      ),
      styleRules: {
        ifMissingInfo: "Make a tasteful professional assumption, but do not invent specific facts.",
        mandatoryNonEmpty: "Do not return empty strings for any key listed in missingValuesKeys or missingBriefKeys.",
      },
    },
    null,
    2
  );
}

function mergeRepairPatch(
  values: ProjectCopyValues,
  brief: Record<GenerateAllBriefKey, string>,
  missingCopy: ProjectCopyFieldKey[],
  missingBrief: GenerateAllBriefKey[],
  patchRaw: Record<string, unknown>
): { values: ProjectCopyValues; brief: Record<GenerateAllBriefKey, string> } {
  const vObj =
    patchRaw.values && typeof patchRaw.values === "object" && !Array.isArray(patchRaw.values)
      ? (patchRaw.values as Record<string, unknown>)
      : {};
  const bObj =
    patchRaw.brief && typeof patchRaw.brief === "object" && !Array.isArray(patchRaw.brief)
      ? (patchRaw.brief as Record<string, unknown>)
      : {};
  const nextValues = { ...values };
  const nextBrief = { ...brief };
  for (const k of missingCopy) {
    const v = normalizeGeneratedValue(vObj[k]).trim();
    if (v) nextValues[k] = enforceLength(k, v);
  }
  for (const k of missingBrief) {
    const v = normalizeGeneratedValue(bObj[k]).trim();
    if (v) nextBrief[k] = v;
  }
  return { values: nextValues, brief: nextBrief };
}

async function repairAllFieldsIfNeeded(
  openai: OpenAI,
  model: string,
  input: Extract<ProjectCopyRequest, { mode: "all_fields" }>,
  values: ProjectCopyValues,
  brief: Record<GenerateAllBriefKey, string>
): Promise<{ values: ProjectCopyValues; brief: Record<GenerateAllBriefKey, string> }> {
  const missingCopy = PROJECT_COPY_FIELD_KEYS.filter((k) => !(values[k] ?? "").trim());
  const missingBrief = GENERATE_ALL_BRIEF_KEYS.filter((k) => !(brief[k] ?? "").trim());
  if (missingCopy.length === 0 && missingBrief.length === 0) return { values, brief };

  const completion = await runAiChatCompletion(
    openai,
    {
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROJECT_COPY_REPAIR_ALL_FIELDS.systemPrompt },
        {
          role: "user",
          content: buildRepairPrompt(input, missingCopy, missingBrief, values, brief),
        },
      ],
    },
    {
      taskType: "project_copy.repair_all_fields",
      promptId: PROJECT_COPY_REPAIR_ALL_FIELDS.id,
      promptVersion: PROJECT_COPY_REPAIR_ALL_FIELDS.version,
      projectId: input.projectId ?? null,
      createdBy: "admin",
      inputSummary: { mode: "all_fields", repair: true, missingCopy: missingCopy.length, missingBrief: missingBrief.length },
    }
  );
  const content = completion.choices[0]?.message?.content ?? "{}";
  const patchRaw = parseJsonObject(content);
  return mergeRepairPatch(values, brief, missingCopy, missingBrief, patchRaw);
}

function normalizeBriefCaseStudyResponse(raw: Record<string, unknown>) {
  return {
    ...normalizeAllResponse(raw),
    imageDirectionNotes: enforceLength("overviewExtended", normalizeGeneratedValue(raw.imageDirectionNotes)),
    suggestedPlacement: enforceLength("overviewExtended", normalizeGeneratedValue(raw.suggestedPlacement)),
  };
}

export async function generateProjectCopy(input: ProjectCopyRequest) {
  const openai = createOpenAiClient();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const copyMeta = {
    taskType: `project_copy.${input.mode}`,
    promptId: PROJECT_COPY_EDITORIAL.id,
    promptVersion: PROJECT_COPY_EDITORIAL.version,
    projectId: input.projectId ?? null,
    createdBy: "admin",
    inputSummary: {
      mode: input.mode,
      ...("fieldKey" in input ? { fieldKey: input.fieldKey } : {}),
    },
  };

  try {
    const completion = await runAiChatCompletion(
      openai,
      {
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PROJECT_COPY_EDITORIAL.systemPrompt },
          { role: "user", content: buildPrompt(input) },
        ],
      },
      copyMeta
    );
    const content = completion.choices[0]?.message?.content ?? "{}";
    const raw = parseJsonObject(content);
    if (input.mode === "single_field") return normalizeSingleResponse(raw, input.fieldKey);
    if (input.mode === "rewrite_field") return normalizeSingleResponse(raw, input.fieldKey);
    if (input.mode === "brief_case_study") return normalizeBriefCaseStudyResponse(raw);
    if (input.mode === "all_fields") {
      let bundle = normalizeAllFieldsBundle(raw);
      bundle = await repairAllFieldsIfNeeded(openai, model, input, bundle.values, bundle.brief);
      return bundle;
    }
    const exhaustive: never = input;
    throw new Error(`Unsupported mode: ${String(exhaustive)}`);
  } catch (err: unknown) {
    if (err instanceof APIError) {
      const status = err.status === 429 ? 429 : err.status === 408 ? 504 : 502;
      const message =
        err.status === 429
          ? "Rate limited by the model provider. Try again shortly."
          : err.status === 401 || err.status === 403
            ? "Model provider rejected credentials."
            : "AI generation failed.";
      throw Object.assign(new Error(message), { status });
    }
    throw err;
  }
}

