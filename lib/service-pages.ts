import { services as defaultServices, type Service } from "@/app/services/data";
import { prisma } from "@/lib/prisma";

const SERVICE_PAGES_SETTING_KEY = "service_pages:v1";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function blankService(slug = "new-service"): Service {
  return {
    slug,
    title: "New Service Page",
    summary: "Short service summary.",
    description: "Describe this service page.",
    overview: ["Describe how this service works, who it is for, and how the final assets are used."],
    serviceDetails: [
      {
        title: "Service detail",
        body: "Explain a specific part of the service in more depth.",
      },
    ],
    bestFor: ["Ideal client or project type"],
    heroTagline: "Short positioning line.",
    portfolioLabel: "View portfolio",
    portfolioHref: "/work",
    heroImage: "/images/hero.jpg",
    heroVideo: "",
    backgroundMediaUrl: "",
    backgroundPosterUrl: "",
    proofImages: ["/images/hero.jpg"],
    industries: ["Industry"],
    deliverables: ["Deliverable"],
    process: ["Process step"],
    pricing: {
      label: "Starting at",
      range: "Custom quote",
      disclaimer: "Pricing depends on scope.",
      licensing: "Usage and licensing quoted by project.",
    },
    faqs: [{ q: "Question?", a: "Answer." }],
    caseStudies: [],
    caseStudiesEnabled: true,
    caseStudiesIntro: "Explore related projects and outcomes.",
    relatedServicesEnabled: true,
    relatedServicesIntro: "",
    relatedServicesLinks: [],
    showRelatedContactButton: true,
  };
}

function stringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const normalized = value.map((item) => String(item).trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : fallback;
}

function serviceDetailArray(value: unknown, fallback: Service["serviceDetails"]) {
  if (!Array.isArray(value)) return fallback;
  const normalized = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const title = typeof row.title === "string" ? row.title.trim() : "";
      const body = typeof row.body === "string" ? row.body.trim() : "";
      return title && body ? { title, body } : null;
    })
    .filter(Boolean) as Service["serviceDetails"];
  return normalized.length > 0 ? normalized : fallback;
}

function faqArray(value: unknown, fallback: Service["faqs"]) {
  if (!Array.isArray(value)) return fallback;
  const normalized = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const q = typeof row.q === "string" ? row.q.trim() : "";
      const a = typeof row.a === "string" ? row.a.trim() : "";
      return q && a ? { q, a } : null;
    })
    .filter(Boolean) as Service["faqs"];
  return normalized.length > 0 ? normalized : fallback;
}

function caseStudyArray(value: unknown, fallback: Service["caseStudies"]) {
  if (!Array.isArray(value)) return fallback;
  const normalized = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const slug = typeof row.slug === "string" ? row.slug.trim() : "";
      const title = typeof row.title === "string" ? row.title.trim() : "";
      if (!slug || !title) return null;
      return {
        slug,
        title,
        category: typeof row.category === "string" ? row.category.trim() : "",
        image: typeof row.image === "string" ? row.image.trim() : "",
        meta: typeof row.meta === "string" ? row.meta.trim() : "",
        ...(typeof row.href === "string" && row.href.trim() ? { href: row.href.trim() } : {}),
      };
    })
    .filter(Boolean) as Service["caseStudies"];
  return normalized.length > 0 ? normalized : fallback;
}

function relatedLinkArray(value: unknown, fallback: Service["relatedServicesLinks"]) {
  if (!Array.isArray(value)) return fallback ?? [];
  const normalized = value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const slug = typeof row.slug === "string" ? slugify(row.slug) : "";
      const title = typeof row.title === "string" ? row.title.trim() : "";
      return slug && title ? { slug, title } : null;
    })
    .filter(Boolean) as NonNullable<Service["relatedServicesLinks"]>;
  return normalized.length > 0 ? normalized : fallback ?? [];
}

export function normalizeServicePage(input: unknown, fallback: Service): Service {
  const row = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const pricing = row.pricing && typeof row.pricing === "object"
    ? (row.pricing as Record<string, unknown>)
    : {};
  const rawSlug = typeof row.slug === "string" && row.slug.trim() ? row.slug : fallback.slug;

  return {
    slug: slugify(rawSlug) || fallback.slug,
    title: typeof row.title === "string" && row.title.trim() ? row.title.trim() : fallback.title,
    summary: typeof row.summary === "string" && row.summary.trim() ? row.summary.trim() : fallback.summary,
    description:
      typeof row.description === "string" && row.description.trim()
        ? row.description.trim()
        : fallback.description,
    overview: stringArray(row.overview, fallback.overview),
    serviceDetails: serviceDetailArray(row.serviceDetails, fallback.serviceDetails),
    bestFor: stringArray(row.bestFor, fallback.bestFor),
    heroTagline:
      typeof row.heroTagline === "string" && row.heroTagline.trim()
        ? row.heroTagline.trim()
        : fallback.heroTagline,
    portfolioLabel:
      typeof row.portfolioLabel === "string" && row.portfolioLabel.trim()
        ? row.portfolioLabel.trim()
        : fallback.portfolioLabel,
    portfolioHref:
      typeof row.portfolioHref === "string" && row.portfolioHref.trim()
        ? row.portfolioHref.trim()
        : fallback.portfolioHref,
    heroImage:
      typeof row.heroImage === "string" && row.heroImage.trim()
        ? row.heroImage.trim()
        : fallback.heroImage,
    heroVideo: typeof row.heroVideo === "string" ? row.heroVideo.trim() : fallback.heroVideo,
    backgroundMediaUrl:
      typeof row.backgroundMediaUrl === "string"
        ? row.backgroundMediaUrl.trim()
        : fallback.backgroundMediaUrl,
    backgroundPosterUrl:
      typeof row.backgroundPosterUrl === "string"
        ? row.backgroundPosterUrl.trim()
        : fallback.backgroundPosterUrl,
    proofImages: stringArray(row.proofImages, fallback.proofImages),
    industries: stringArray(row.industries, fallback.industries),
    deliverables: stringArray(row.deliverables, fallback.deliverables),
    process: stringArray(row.process, fallback.process),
    pricing: {
      label:
        typeof pricing.label === "string" && pricing.label.trim()
          ? pricing.label.trim()
          : fallback.pricing.label,
      range:
        typeof pricing.range === "string" && pricing.range.trim()
          ? pricing.range.trim()
          : fallback.pricing.range,
      disclaimer:
        typeof pricing.disclaimer === "string" && pricing.disclaimer.trim()
          ? pricing.disclaimer.trim()
          : fallback.pricing.disclaimer,
      licensing:
        typeof pricing.licensing === "string" && pricing.licensing.trim()
          ? pricing.licensing.trim()
          : fallback.pricing.licensing,
    },
    faqs: faqArray(row.faqs, fallback.faqs),
    caseStudies: caseStudyArray(row.caseStudies, fallback.caseStudies),
    caseStudiesEnabled: row.caseStudiesEnabled !== false,
    caseStudiesIntro:
      typeof row.caseStudiesIntro === "string" && row.caseStudiesIntro.trim()
        ? row.caseStudiesIntro.trim()
        : fallback.caseStudiesIntro ?? "Explore related projects and outcomes.",
    relatedServicesEnabled: row.relatedServicesEnabled !== false,
    relatedServicesIntro:
      typeof row.relatedServicesIntro === "string"
        ? row.relatedServicesIntro.trim()
        : fallback.relatedServicesIntro ?? "",
    relatedServicesLinks: relatedLinkArray(row.relatedServicesLinks, fallback.relatedServicesLinks),
    showRelatedContactButton: row.showRelatedContactButton !== false,
  };
}

export function mergeServicePageOverrides(raw: unknown): Service[] {
  const overrides = Array.isArray(raw) ? raw : [];
  const mergedDefaults = defaultServices.map((fallback) => {
    const override = overrides.find(
      (item) =>
        item &&
        typeof item === "object" &&
        (item as Record<string, unknown>).slug === fallback.slug
    );
    return normalizeServicePage(override, fallback);
  });

  const custom = overrides
    .filter(
      (item) =>
        item &&
        typeof item === "object" &&
        !defaultServices.some(
          (fallback) => fallback.slug === (item as Record<string, unknown>).slug
        )
    )
    .map((item) => normalizeServicePage(item, blankService(String((item as Record<string, unknown>).slug ?? "new-service"))));

  return [...mergedDefaults, ...custom];
}

function normalizeSavedServicePages(raw: unknown): Service[] {
  if (!Array.isArray(raw)) return defaultServices;
  const seen = new Set<string>();
  return raw
    .map((item, index) => {
      const fallback =
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).slug === "string"
          ? defaultServices.find((service) => service.slug === (item as Record<string, unknown>).slug) ??
            blankService(String((item as Record<string, unknown>).slug))
          : blankService(`service-${index + 1}`);
      const normalized = normalizeServicePage(item, fallback);
      if (seen.has(normalized.slug)) return null;
      seen.add(normalized.slug);
      return normalized;
    })
    .filter(Boolean) as Service[];
}

export async function getEditableServicePages(): Promise<Service[]> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: SERVICE_PAGES_SETTING_KEY },
      select: { value: true },
    });
    if (!setting?.value) return defaultServices;
    return normalizeSavedServicePages(JSON.parse(setting.value));
  } catch {
    return defaultServices;
  }
}

export async function getEditableServicePageBySlug(slug: string): Promise<Service | null> {
  const all = await getEditableServicePages();
  return all.find((service) => service.slug === slug) ?? null;
}

export async function saveEditableServicePages(input: unknown): Promise<Service[]> {
  const normalized = normalizeSavedServicePages(input);
  await prisma.siteSetting.upsert({
    where: { key: SERVICE_PAGES_SETTING_KEY },
    update: { value: JSON.stringify(normalized) },
    create: { key: SERVICE_PAGES_SETTING_KEY, value: JSON.stringify(normalized) },
  });
  return normalized;
}
