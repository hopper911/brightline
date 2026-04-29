import { GENERATE_COPY_SYSTEM } from "@/lib/ai/projectCopyPrompt";
import { slugify } from "@/lib/slugify";

export type GenerateCopyInput = {
  title?: string;
  client?: string;
  category?: string;
  subcategory?: string;
  location?: string;
  year?: string;
  briefNotes?: string;
  notes?: string;
  imageNotes?: string[];
  imageUrls?: string[];
  credits?: string;
};

export type GenerateCopyResult = {
  title: string;
  slug: string;
  client: string;
  category: string;
  subcategory: string;
  location: string;
  year: string;
  opening: string;
  context: string;
  approach: string;
  highlight: string;
  execution: string;
  next: string;
  credits: string;
  seoTitle: string;
  seoDescription: string;
  tags: string[];
};

const YEAR_MIN = 1980;
const YEAR_MAX = 2035;

function normalizeYear(raw: unknown): { ok: true; year?: string } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") return { ok: true };
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
      return { ok: false, error: "year must be a four-digit year when provided." };
    }
    if (y < YEAR_MIN || y > YEAR_MAX) {
      return { ok: false, error: `year must be between ${YEAR_MIN} and ${YEAR_MAX}.` };
    }
    return { ok: true, year: String(y) };
  }
  return { ok: false, error: "year must be a four-digit year when provided." };
}

function stringValue(raw: unknown): string | undefined {
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

function stringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 50);
}

export function parseGenerateCopyInput(body: unknown):
  | { ok: true; data: GenerateCopyInput }
  | { ok: false; error: string; status: number } {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object.", status: 400 };
  }

  const o = body as Record<string, unknown>;
  const title = stringValue(o.title ?? o.projectTitle);
  const briefNotes = stringValue(o.briefNotes ?? o.notes ?? o.rawNotes);
  if (!title && !briefNotes) {
    return { ok: false, error: "title or briefNotes is required.", status: 400 };
  }

  const yearResult = normalizeYear(o.year);
  if (!yearResult.ok) {
    return { ok: false, error: yearResult.error, status: 400 };
  }

  const input: GenerateCopyInput = {
    ...(title ? { title } : {}),
    ...(stringValue(o.client) ? { client: stringValue(o.client) } : {}),
    ...(stringValue(o.category) ? { category: stringValue(o.category) } : {}),
    ...(stringValue(o.subcategory ?? o.subCategory)
      ? { subcategory: stringValue(o.subcategory ?? o.subCategory) }
      : {}),
    ...(stringValue(o.location) ? { location: stringValue(o.location) } : {}),
    ...(yearResult.year ? { year: yearResult.year } : {}),
    ...(briefNotes ? { briefNotes, notes: briefNotes } : {}),
    ...(stringArray(o.imageNotes).length ? { imageNotes: stringArray(o.imageNotes) } : {}),
    ...(stringArray(o.imageUrls).length ? { imageUrls: stringArray(o.imageUrls) } : {}),
    ...(stringValue(o.credits) ? { credits: stringValue(o.credits) } : {}),
  };

  return { ok: true, data: input };
}

function sentence(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function compact(input?: string) {
  return input?.trim() || "";
}

function truncate(input: string, max: number) {
  return input.length <= max ? input : input.slice(0, max - 1).trimEnd();
}

function parseTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t) => String(t).trim()).filter(Boolean).slice(0, 24);
}

export function normalizeGeneratedProject(
  parsed: Record<string, unknown>,
  input: GenerateCopyInput
): GenerateCopyResult {
  const title = String(parsed.title ?? input.title ?? "").trim();
  const client = String(parsed.client ?? input.client ?? "").trim();
  const category = String(parsed.category ?? input.category ?? "").trim();
  const subcategory = String(parsed.subcategory ?? input.subcategory ?? "").trim();
  const location = String(parsed.location ?? input.location ?? "").trim();
  const year = String(parsed.year ?? input.year ?? "").trim();
  const next = String(parsed.next ?? parsed.closing ?? "").trim();
  const slugRaw = String(parsed.slug ?? "").trim();

  return {
    title,
    slug: slugify(slugRaw || title || client || "project"),
    client,
    category,
    subcategory,
    location,
    year,
    opening: String(parsed.opening ?? "").trim(),
    context: String(parsed.context ?? "").trim(),
    approach: String(parsed.approach ?? "").trim(),
    highlight: String(parsed.highlight ?? "").trim(),
    execution: String(parsed.execution ?? "").trim(),
    next,
    credits: String(parsed.credits ?? input.credits ?? "").trim(),
    seoTitle: truncate(String(parsed.seoTitle ?? "").trim(), 65),
    seoDescription: truncate(String(parsed.seoDescription ?? "").trim(), 155),
    tags: parseTags(parsed.tags).slice(0, 12),
  };
}

export function parseGenerateCopyModelJson(
  parsed: Record<string, unknown>,
  input: GenerateCopyInput = {}
): GenerateCopyResult {
  return normalizeGeneratedProject(parsed, input);
}

export function generatedProjectToStudioPayload(result: GenerateCopyResult) {
  const yearNumber = Number(result.year);
  return {
    title: result.title || "Untitled Project",
    slug: result.slug || undefined,
    client: result.client || "—",
    category: result.category || "—",
    subcategory: result.subcategory || null,
    location: result.location || "—",
    year:
      Number.isFinite(yearNumber) && yearNumber > 0
        ? Math.trunc(yearNumber)
        : new Date().getFullYear(),
    opening: result.opening || "—",
    context: result.context || "—",
    approach: result.approach || "—",
    highlight: result.highlight || "—",
    execution: result.execution || null,
    closing: result.next || "Ready for final review and publishing.",
    seoTitle: result.seoTitle || null,
    seoDescription: result.seoDescription || null,
    tags: result.tags,
    credits: result.credits || null,
    contentStatus: "WEBSITE_COPY_DRAFTED",
    websiteCopyDrafted: true,
    published: false,
    gallery: [],
  };
}

export function generateLocalProjectCopy(data: GenerateCopyInput): GenerateCopyResult {
  const title = compact(data.title) || compact(data.client) || "Project";
  const client = compact(data.client);
  const category = compact(data.category);
  const subcategory = compact(data.subcategory);
  const location = compact(data.location);
  const year = compact(data.year);
  const brief = compact(data.briefNotes ?? data.notes);
  const service = [category, subcategory].filter(Boolean).join(" ");
  const subject = service || "commercial photography";

  return {
    title,
    slug: slugify(title),
    client,
    category,
    subcategory,
    location,
    year,
    opening: sentence([
      `${title} was developed as a focused ${subject.toLowerCase()} project${client ? ` for ${client}` : ""}.`,
      "The work was shaped for practical marketing use across web, portfolio, and client-facing materials.",
    ]),
    context: sentence([
      location ? `The project is grounded in ${location}${year ? `, ${year}` : ""}.` : undefined,
      brief ? `The brief emphasized ${brief.replace(/\.$/, "")}.` : undefined,
      "The copy stays general where the source notes do not provide specific facts.",
    ]),
    approach: sentence([
      "The visual strategy prioritizes clear composition, controlled perspective, useful detail coverage, and a structured final asset set.",
      "Each frame is considered for how it can support website, marketing, social, and archive use.",
    ]),
    highlight: "A structured visual library built for commercial use beyond the shoot day.",
    execution: "Final presentation should prioritize clean sequencing, consistent naming, and channel-ready delivery.",
    next: "Ready for final review and publishing.",
    credits: compact(data.credits),
    seoTitle: truncate(`${title} | BRIGHTLINE Photography`, 65),
    seoDescription: truncate(
      `${subject} project${client ? ` for ${client}` : ""}${location ? ` in ${location}` : ""}, created as structured marketing-ready visual assets.`,
      155
    ),
    tags: Array.from(
      new Set(
        [
          client,
          category,
          subcategory,
          location,
          year,
          "BRIGHTLINE Photography",
          "commercial photography",
          "marketing-ready assets",
          "project delivery",
        ]
          .map((tag) => tag.trim())
          .filter(Boolean)
      )
    ).slice(0, 12),
  };
}

export function buildGenerateCopyUserPayload(data: GenerateCopyInput): string {
  return JSON.stringify(
    {
      ...(data.title ? { title: data.title } : {}),
      ...(data.client ? { client: data.client } : {}),
      ...(data.category ? { category: data.category } : {}),
      ...(data.subcategory ? { subcategory: data.subcategory } : {}),
      ...(data.location ? { location: data.location } : {}),
      ...(data.year ? { year: data.year } : {}),
      ...(data.briefNotes || data.notes ? { briefNotes: data.briefNotes ?? data.notes } : {}),
      ...(data.imageNotes?.length ? { imageNotes: data.imageNotes } : {}),
      ...(data.imageUrls?.length ? { imageUrls: data.imageUrls } : {}),
      ...(data.credits ? { credits: data.credits } : {}),
    },
    null,
    0
  );
}

export { GENERATE_COPY_SYSTEM };
