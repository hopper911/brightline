/**
 * Optional AI draft scaffolding for Mirotech case study templates.
 * Returns draft-only content — never auto-publishes or invents metrics.
 */

import { createOpenAiClient, resolveOpenAiChatModel, runChatCompletion } from "@/lib/ai/runtime";
import { safeAiClientError } from "@/lib/ai/safe-client-error";
import {
  buildMirotechTemplateSectionPayload,
  getMirotechCaseStudyTemplateDef,
  type MirotechCaseStudyTemplateDef,
} from "@/lib/platform/projects/mirotech-template-definitions";

export type MirotechTemplateDraftRequest = {
  templateId: string;
  title: string;
  brief: string;
};

export type MirotechTemplateDraftSection = {
  type: string;
  title: string;
  body: string;
  sortOrder: number;
  hint: string;
};

export type MirotechTemplateDraftResult = {
  ok: true;
  draftOnly: true;
  templateId: string;
  templateLabel: string;
  sections: MirotechTemplateDraftSection[];
  coreFields: {
    summary: string;
    role: string;
    challenge: string;
    outcome: string;
    projectDisclaimer: string;
  };
  seoHints: {
    titlePattern: string;
    descriptionHint: string;
  };
  aiGenerated: boolean;
};

export type MirotechTemplateDraftError = {
  ok: false;
  error: string;
  code?: string;
  status?: number;
};

function structureOnlyDraft(def: MirotechCaseStudyTemplateDef, title: string): MirotechTemplateDraftResult {
  const sections = buildMirotechTemplateSectionPayload(def).map((section, index) => ({
    type: section.type,
    title: section.title,
    body: "",
    sortOrder: index,
    hint: def.sections[index]?.hint ?? "",
  }));

  return {
    ok: true,
    draftOnly: true,
    templateId: def.id,
    templateLabel: def.label,
    sections,
    coreFields: {
      summary: "",
      role: "",
      challenge: "",
      outcome: "",
      projectDisclaimer: "",
    },
    seoHints: {
      titlePattern: def.seo.titlePattern.replace("{Project title}", title.trim() || "Project title"),
      descriptionHint: def.seo.descriptionHint,
    },
    aiGenerated: false,
  };
}

function parseDraftJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model returned invalid JSON.");
    return JSON.parse(match[0]) as Record<string, unknown>;
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isOpenAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function generateMirotechTemplateDraft(
  input: MirotechTemplateDraftRequest
): Promise<MirotechTemplateDraftResult | MirotechTemplateDraftError> {
  const title = input.title?.trim();
  const brief = input.brief?.trim();
  if (!title) {
    return { ok: false, error: "title is required.", status: 400 };
  }
  if (!brief) {
    return { ok: false, error: "brief is required for AI drafting.", status: 400 };
  }

  const def = getMirotechCaseStudyTemplateDef(input.templateId);
  if (!def) {
    return { ok: false, error: `Unknown template "${input.templateId}".`, status: 400 };
  }

  if (!def.aiDraft.enabled || !isOpenAiConfigured()) {
    return structureOnlyDraft(def, title);
  }

  const sectionTitles = def.sections.map((s) => s.title);
  const system = `${def.aiDraft.guidance}

Output JSON only with keys:
- coreFields: { summary, role, challenge, outcome, projectDisclaimer }
- sections: array of { title, body } matching these section titles exactly: ${sectionTitles.join("; ")}

Rules:
- Draft only — operator must review before publish.
- Never invent ROI, customers, certifications, or live metrics.
- Label conceptual work in projectDisclaimer when appropriate.
- Section bodies: concise paragraphs; metrics sections use body for reflection only (no fake KPIs).`;

  try {
    const client = createOpenAiClient();
    const model = resolveOpenAiChatModel();
    const completion = await runChatCompletion(client, {
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Project title: ${title}\n\nProject brief (rough notes):\n${brief}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 2800,
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const raw = parseDraftJson(content);
    const coreRaw =
      raw.coreFields && typeof raw.coreFields === "object" && !Array.isArray(raw.coreFields)
        ? (raw.coreFields as Record<string, unknown>)
        : {};
    const sectionsRaw = Array.isArray(raw.sections) ? raw.sections : [];

    const sections: MirotechTemplateDraftSection[] = def.sections.map((shell, index) => {
      const match = sectionsRaw.find(
        (item) =>
          item &&
          typeof item === "object" &&
          asString((item as Record<string, unknown>).title).toLowerCase() === shell.title.toLowerCase()
      ) as Record<string, unknown> | undefined;
      return {
        type: shell.type,
        title: shell.title,
        body: match ? asString(match.body) : "",
        sortOrder: index,
        hint: shell.hint,
      };
    });

    return {
      ok: true,
      draftOnly: true,
      templateId: def.id,
      templateLabel: def.label,
      sections,
      coreFields: {
        summary: asString(coreRaw.summary),
        role: asString(coreRaw.role),
        challenge: asString(coreRaw.challenge),
        outcome: asString(coreRaw.outcome),
        projectDisclaimer: asString(coreRaw.projectDisclaimer),
      },
      seoHints: {
        titlePattern: def.seo.titlePattern.replace("{Project title}", title),
        descriptionHint: def.seo.descriptionHint,
      },
      aiGenerated: true,
    };
  } catch (err: unknown) {
    const safe = safeAiClientError(err);
    return {
      ok: false,
      error: safe.error,
      code: safe.code,
      status: safe.status,
    };
  }
}
