import OpenAI, { APIError } from "openai";

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
] as const;

export type ProjectCopyFieldKey = (typeof PROJECT_COPY_FIELD_KEYS)[number];

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
    "Optional. Mention technique, retouching, production, image selection, lighting, or delivery only if it adds value.",
  closing: "One clean closing line connecting the project to the client's brand, space, campaign, or audience.",
  credits: "Only generate if relevant. Otherwise return an empty string.",
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
};

const SYSTEM_PROMPT = `You are the senior editorial strategist for BRIGHTLINE Photography, a high-end commercial photography studio in New Jersey and the New York metro.

Write polished project copy that is editorial, strategic, modern, clear, high-end, and commercially useful.

Avoid generic AI language and these phrases: elevate your brand, capture the essence, stunning visuals, unforgettable moments, cutting-edge, game-changing, leverage, seamless experience, bespoke unless it truly fits.

Use confident, clean photography language. Do not invent fake awards, fake locations, fake collaborators, or fake client claims. Do not claim "industry-leading" unless provided.

Return JSON only. No markdown. No explanations. Respect the field-specific length and format rules.`;

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
          : "Generate copy for all editable project fields.",
      responseShape:
        input.mode === "single_field" || input.mode === "rewrite_field"
          ? { fieldKey: input.fieldKey, value: "Generated text here" }
          : input.mode === "brief_case_study"
            ? {
                values: Object.fromEntries(requestedFields.map((key) => [key, ""])),
                imageDirectionNotes: "",
                suggestedPlacement: "",
              }
          : { values: Object.fromEntries(PROJECT_COPY_FIELD_KEYS.map((key) => [key, ""])) },
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
        credits: "Return empty string if no real credit information is provided.",
        rewrite: "For rewrite_field mode, preserve the meaning and facts of sourceText. Improve clarity and Bright Line brand voice.",
        briefCaseStudy:
          "For brief_case_study mode, use sourceText as the rough notes. Produce a complete, specific, premium editorial case study draft. Do not invent specific facts beyond tasteful general framing.",
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

function normalizeBriefCaseStudyResponse(raw: Record<string, unknown>) {
  return {
    ...normalizeAllResponse(raw),
    imageDirectionNotes: enforceLength("overviewExtended", normalizeGeneratedValue(raw.imageDirectionNotes)),
    suggestedPlacement: enforceLength("overviewExtended", normalizeGeneratedValue(raw.suggestedPlacement)),
  };
}

export async function generateProjectCopy(input: ProjectCopyRequest) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw Object.assign(new Error("AI generation is not configured."), { status: 500 });
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const openai = new OpenAI({ apiKey });

  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(input) },
      ],
    });
    const content = completion.choices[0]?.message?.content ?? "{}";
    const raw = parseJsonObject(content);
    if (input.mode === "single_field") return normalizeSingleResponse(raw, input.fieldKey);
    if (input.mode === "rewrite_field") return normalizeSingleResponse(raw, input.fieldKey);
    if (input.mode === "brief_case_study") return normalizeBriefCaseStudyResponse(raw);
    return normalizeAllResponse(raw);
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

