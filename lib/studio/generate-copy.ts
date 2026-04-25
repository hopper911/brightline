import { GENERATE_COPY_SYSTEM } from "@/lib/ai/projectCopyPrompt";

export type GenerateCopyInput = {
  client: string;
  category: string;
  location: string;
  /** Normalized calendar year as string, e.g. "2024" */
  year: string;
  notes: string;
  /** Optional working title; may inform SEO and tone */
  title?: string;
  /** Optional; e.g. Lookbook, Annual report */
  subcategory?: string;
};

export type GenerateCopyResult = {
  opening: string;
  context: string;
  approach: string;
  highlight: string;
  execution: string;
  closing: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
};

const YEAR_MIN = 1980;
const YEAR_MAX = 2035;

function normalizeYear(raw: unknown): { ok: true; year: string } | { ok: false; error: string } {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const y = Math.trunc(raw);
    if (y < YEAR_MIN || y > YEAR_MAX) {
      return { ok: false, error: `year must be between ${YEAR_MIN} and ${YEAR_MAX}.` };
    }
    return { ok: true, year: String(y) };
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    const y = parseInt(trimmed, 10);
    if (!/^\d{4}$/.test(trimmed) || Number.isNaN(y)) {
      return { ok: false, error: "year must be a four-digit year." };
    }
    if (y < YEAR_MIN || y > YEAR_MAX) {
      return { ok: false, error: `year must be between ${YEAR_MIN} and ${YEAR_MAX}.` };
    }
    return { ok: true, year: String(y) };
  }
  return { ok: false, error: "year is required (number or four-digit string)." };
}

export function parseGenerateCopyInput(body: unknown):
  | { ok: true; data: GenerateCopyInput }
  | { ok: false; error: string; status: number } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object.", status: 400 };
  }

  const o = body as Record<string, unknown>;

  const client = typeof o.client === "string" ? o.client.trim() : "";
  const category = typeof o.category === "string" ? o.category.trim() : "";
  const location = typeof o.location === "string" ? o.location.trim() : "";
  const notesRaw = o.notes ?? o.rawNotes;
  const notes = typeof notesRaw === "string" ? notesRaw.trim() : "";

  const titleRaw = o.title ?? o.projectTitle;
  const title =
    typeof titleRaw === "string" && titleRaw.trim() ? titleRaw.trim() : undefined;

  const subRaw = o.subcategory ?? o.subCategory;
  const subcategory =
    typeof subRaw === "string" && subRaw.trim() ? subRaw.trim() : undefined;

  if (!client) {
    return { ok: false, error: "client is required.", status: 400 };
  }
  if (!category) {
    return { ok: false, error: "category is required.", status: 400 };
  }
  if (!location) {
    return { ok: false, error: "location is required.", status: 400 };
  }
  const yearResult = normalizeYear(o.year);
  if (!yearResult.ok) {
    return { ok: false, error: yearResult.error, status: 400 };
  }

  return {
    ok: true,
    data: {
      client,
      category,
      location,
      year: yearResult.year,
      notes: notes || "No extra notes provided. Draft practical, polished case-study copy from the available project details.",
      title,
      ...(subcategory ? { subcategory } : {}),
    },
  };
}

function sentence(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function generateLocalProjectCopy(data: GenerateCopyInput): GenerateCopyResult {
  const projectTitle = data.title?.trim() || `${data.client} ${data.category}`;
  const service = data.subcategory ? `${data.category} ${data.subcategory}` : data.category;
  const note = data.notes.replace(/^No extra notes provided\.\s*/i, "").trim();
  const noteContext = note && !note.startsWith("Draft practical") ? ` The brief emphasized ${note.replace(/\.$/, "")}.` : "";

  return {
    opening: sentence([
      `${projectTitle} was developed as a ${service.toLowerCase()} story for ${data.client}.`,
      `The goal was to create polished, practical imagery that could carry across web, portfolio, social, and client-facing materials.`,
    ]),
    context: sentence([
      `Photographed in ${data.location} in ${data.year}, the project needed to balance atmosphere, clarity, and commercial usefulness.`,
      `${noteContext}`,
      `Every scene was approached with the final delivery in mind so the assets would feel cohesive beyond the shoot day.`,
    ]),
    approach: sentence([
      `BRIGHTLINE built the production around intentional composition, controlled pacing, and a structured shot list.`,
      `The work focused on strong hero frames, supporting details, and flexible crops that could be reused across digital channels.`,
    ]),
    highlight: `${titleCase(service)} visuals prepared for real-world brand use.`,
    execution: sentence([
      `Final assets were organized for quick review and practical activation, with attention to naming, sequence, visual consistency, and channel-ready presentation.`,
    ]),
    closing: sentence([
      `The result is a focused visual library for ${data.client}: refined enough for a premium first impression and structured enough for ongoing use.`,
    ]),
    seoTitle: `${projectTitle} | BRIGHTLINE Photography`,
    seoDescription: `${service} project for ${data.client} in ${data.location}, photographed by BRIGHTLINE Photography with structured delivery for web, search, and social.`,
    tags: Array.from(
      new Set([
        data.client,
        data.category,
        ...(data.subcategory ? [data.subcategory] : []),
        data.location,
        data.year,
        "BRIGHTLINE Photography",
        "commercial photography",
        "structured delivery",
      ].map((tag) => tag.trim()).filter(Boolean))
    ).slice(0, 12),
  };
}

export function buildGenerateCopyUserPayload(data: GenerateCopyInput): string {
  return JSON.stringify(
    {
      client: data.client,
      category: data.category,
      location: data.location,
      year: data.year,
      notes: data.notes,
      ...(data.title ? { title: data.title } : {}),
      ...(data.subcategory ? { subcategory: data.subcategory } : {}),
    },
    null,
    0
  );
}

function parseTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => String(t).trim()).filter(Boolean).slice(0, 24);
}

export function parseGenerateCopyModelJson(parsed: Record<string, unknown>): GenerateCopyResult {
  return {
    opening: String(parsed.opening ?? "").trim(),
    context: String(parsed.context ?? "").trim(),
    approach: String(parsed.approach ?? "").trim(),
    highlight: String(parsed.highlight ?? "").trim(),
    execution: String(parsed.execution ?? "").trim(),
    closing: String(parsed.closing ?? "").trim(),
    seoTitle: String(parsed.seoTitle ?? "").trim(),
    seoDescription: String(parsed.seoDescription ?? "").trim(),
    tags: parseTags(parsed.tags),
  };
}

export { GENERATE_COPY_SYSTEM };
