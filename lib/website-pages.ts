import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { resolveStoredMediaUrl } from "@/lib/r2";

export type WebsitePageStatus = "PUBLISHED" | "DRAFT";
export type WebsiteBlockType = "hero" | "gallery" | "stats" | "text" | "cards" | "list" | "cta" | "contactForm";

export type WebsiteBlockItem = {
  title: string;
  body: string;
  meta?: string;
  mediaUrl?: string;
};

export type WebsiteBlock = {
  id: string;
  type: WebsiteBlockType;
  label: string;
  eyebrow: string;
  title: string;
  body: string;
  mediaUrl: string;
  posterUrl: string;
  items: WebsiteBlockItem[];
  ctaLabel: string;
  ctaHref: string;
  /** Hero only — show the recent-project card grid beside the headline (default on). */
  showcaseEnabled?: boolean;
};

export type WebsitePage = {
  id: string;
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  status: WebsitePageStatus;
  updatedAt: string;
  blocks: WebsiteBlock[];
  managed?: boolean;
};

const WEBSITE_PAGES_SETTING_KEY = "website_pages:v1";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function newId(prefix = "page") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function blankBlock(type: WebsiteBlockType = "text", label = "Content block"): WebsiteBlock {
  return {
    id: newId("block"),
    type,
    label,
    eyebrow: "",
    title: type === "contactForm" ? "Inquiry form" : "Block title",
    body: type === "contactForm" ? "Share project details and timeline." : "Block copy.",
    mediaUrl: "",
    posterUrl: "",
    items:
      type === "stats"
        ? [
            { title: "NJ / NYC", body: "Metro focus", meta: "Tri-State commercial work" },
            { title: "48hr", body: "Response time", meta: "Initial inquiry" },
          ]
        : type === "cards" || type === "list"
          ? [{ title: "Item title", body: "Item copy.", meta: "" }]
          : [],
    ctaLabel:
      type === "cta"
        ? "Contact"
        : type === "hero"
          ? "Contact"
          : type === "gallery"
            ? "Enter gallery"
            : "",
    ctaHref:
      type === "cta"
        ? "/contact"
        : type === "hero"
          ? "/contact"
          : type === "gallery"
            ? "/galleries"
            : "",
    ...(type === "hero" ? { showcaseEnabled: true } : {}),
  };
}

function coreBlock(id: string, patch: Partial<WebsiteBlock>): WebsiteBlock {
  return {
    ...blankBlock(patch.type ?? "text", patch.label ?? "Content block"),
    id,
    ...patch,
  };
}

export const CORE_WEBSITE_PAGES: WebsitePage[] = [
  {
    id: "core_home",
    slug: "home",
    title: "Home",
    eyebrow: "BRIGHTLINE Photography",
    description: "Premium photography with structured delivery.",
    body: "Visuals designed to perform.\n\nPremium photography with structured delivery - assets prepared for web, search, and social, not just the shoot.",
    ctaLabel: "View work",
    ctaHref: "/work",
    status: "DRAFT",
    updatedAt: new Date(0).toISOString(),
    managed: true,
    blocks: [
      coreBlock("home_hero", {
        type: "hero",
        label: "Hero",
        eyebrow: "BRIGHTLINE Photography",
        title: "Visuals designed to perform.",
        body: "Premium photography with structured delivery - assets prepared for web, search, and social, not just the shoot.",
        items: [
          { title: "Architecture", body: "Interiors, exteriors, and spaces" },
          { title: "Commercial", body: "Campaign imagery and launch assets" },
          { title: "Hospitality", body: "Editorial visuals for brands and venues" },
        ],
        ctaLabel: "View work",
        ctaHref: "/work",
      }),
      coreBlock("home_intro", {
        type: "text",
        label: "Visual studio intro",
        eyebrow: "Visual studio",
        title: "Photography plus structured delivery.",
        body: "BRIGHTLINE is a premium visual studio: photography, structured delivery, and intelligent systems that prepare assets for how businesses actually use them - web, search, social, and brand.",
      }),
    ],
  },
  {
    id: "core_about",
    slug: "about",
    title: "About",
    eyebrow: "About BRIGHTLINE",
    description: "A studio built for brands that care how visuals perform.",
    body: "BRIGHTLINE is a premium visual studio: photography plus structured delivery - organized assets, SEO-aware preparation, and practical guidance for web, search, and social.",
    ctaLabel: "Contact",
    ctaHref: "/contact",
    status: "DRAFT",
    updatedAt: new Date(0).toISOString(),
    managed: true,
    blocks: [
      coreBlock("about_hero", {
        type: "hero",
        label: "Hero",
        eyebrow: "About BRIGHTLINE",
        title: "A studio built for brands that care how visuals perform.",
        body: "BRIGHTLINE is a premium visual studio: photography plus structured delivery - organized assets, SEO-aware preparation, and practical guidance for web, search, and social.",
      }),
      coreBlock("about_stats", {
        type: "stats",
        label: "Credibility stats",
        items: [
          { title: "NJ / NYC", body: "Metro focus", meta: "Tri-State commercial work" },
          { title: "48hr", body: "Response time", meta: "Initial inquiry" },
          { title: "5-7", body: "Proof days", meta: "Standard turnaround" },
          { title: "10-14", body: "Final days", meta: "Full delivery" },
        ],
      }),
      coreBlock("about_studio", {
        type: "text",
        label: "The studio",
        eyebrow: "The studio",
        title: "Built by practitioners, not just photographers.",
        body: "BRIGHTLINE started from a simple frustration: too many shoots deliver beautiful files that are hard to use - unclear naming, missing metadata, no guidance for where assets should live. We built a studio around production discipline and structured handoffs.",
      }),
      coreBlock("about_outcomes", {
        type: "cards",
        label: "Outcomes",
        eyebrow: "Outcomes",
        title: "What clients get",
        items: [
          { title: "Brand-ready imagery", body: "Every deliverable is color-corrected, retouched, and optimized for your brand guidelines." },
          { title: "Consistent visual system", body: "From hero shots to detail crops, your assets feel cohesive across web, social, and print." },
          { title: "Decision-maker visuals", body: "Imagery designed to convert - whether selling rooms, leasing space, or launching a campaign." },
        ],
      }),
      coreBlock("about_industries", {
        type: "cards",
        label: "Industries",
        eyebrow: "Industries",
        title: "Who we work with",
        items: [
          { title: "Hospitality", body: "Hotels, resorts, wellness, and travel brands" },
          { title: "Commercial Real Estate", body: "Office, mixed-use, luxury residential, and amenity spaces" },
          { title: "Fashion & Editorial", body: "Campaigns, lookbooks, and ecommerce" },
          { title: "Culinary & Lifestyle", body: "F&B, retail, and brand storytelling" },
        ],
      }),
    ],
  },
  {
    id: "core_services",
    slug: "services",
    title: "Services",
    eyebrow: "Services",
    description: "Commercial photography services for architecture, real estate, hospitality, fashion, advertising, and brand campaigns.",
    body: "BRIGHTLINE Photography provides full-service commercial image production for teams that need more than a quick gallery. Services include pre-production planning, shot-list development, on-site capture, editing, retouching direction, structured delivery, and publishing-ready files for web, search, social, decks, listings, press, and long-term brand libraries.",
    ctaLabel: "View service pages",
    ctaHref: "/services",
    status: "DRAFT",
    updatedAt: new Date(0).toISOString(),
    managed: true,
    blocks: [
      coreBlock("services_hero", {
        type: "hero",
        label: "Hero",
        eyebrow: "Services",
        title: "Photography services built around how your images will be used.",
        body: "From architecture and commercial real estate to fashion, advertising, hospitality, and brand campaigns, each service combines premium capture with planning, production discipline, and structured delivery. The result is a complete visual library your team can use across websites, listings, decks, social, paid campaigns, press, and internal marketing.",
      }),
      coreBlock("services_full_scope", {
        type: "text",
        label: "Full service explanation",
        eyebrow: "Full-service production",
        title: "Not just photographs. A complete visual asset system.",
        body: "Every project starts with the intended use of the images: where they need to live, who needs to approve them, what audiences need to understand, and how quickly the assets need to move after delivery. We plan the shoot around those goals, then create a clear image library that includes hero images, supporting coverage, detail moments, practical crops, and organized final files.\n\nThis approach is especially useful for lean marketing teams, developers, architects, designers, hospitality brands, property teams, and creative teams that need polished imagery without a confusing handoff. The service does not stop at capture. It includes the thinking required to make the final assets easier to publish, repurpose, and manage.",
      }),
      coreBlock("services_stats", {
        type: "stats",
        label: "Credibility stats",
        items: [
          { title: "NJ / NYC", body: "Metro focus", meta: "Tri-State commercial work" },
          { title: "48hr", body: "Response time", meta: "Initial inquiry" },
          { title: "5-7", body: "Proof days", meta: "Standard turnaround" },
          { title: "10-14", body: "Final days", meta: "Full delivery" },
        ],
      }),
      coreBlock("services_packages", {
        type: "cards",
        label: "Packages intro",
        eyebrow: "Packages",
        title: "Tailored to your industry",
        body: "Each service package includes pre-production, capture, post-production, and a structured handoff. Scope is shaped around the project type, usage, timeline, location, and the channels where the images need to perform.",
        items: [
          { title: "Architecture & Spaces Photography", body: "Interiors, exteriors, amenities, hospitality environments, and designed spaces photographed with attention to light, scale, material, circulation, and brand use." },
          { title: "Commercial Real Estate Photography", body: "Property imagery for leasing, investment decks, development marketing, broker materials, amenity launches, and long-term ownership asset libraries." },
          { title: "Fashion & Advertising Photography", body: "Campaign, editorial, lookbook, product, and launch imagery with polished lighting, clear creative direction, and delivery built for multiple marketing channels." },
        ],
      }),
    ],
  },
  {
    id: "core_work",
    slug: "work",
    title: "Work",
    eyebrow: "Work",
    description: "Architecture, advertising, and corporate photography projects.",
    body: "Case studies and project galleries showing how BRIGHTLINE creates visuals for architecture, advertising, corporate, and commercial teams.",
    ctaLabel: "Start a project",
    ctaHref: "/contact",
    status: "DRAFT",
    updatedAt: new Date(0).toISOString(),
    managed: true,
    blocks: [
      coreBlock("work_hero", {
        type: "hero",
        label: "Hero background",
        eyebrow: "Work",
        title: "Case studies",
        body: "Architecture, advertising, and corporate - visuals prepared for how teams actually use them.",
        ctaLabel: "Start a project",
        ctaHref: "/contact",
      }),
    ],
  },
  {
    id: "core_blog",
    slug: "blog",
    title: "Blog",
    eyebrow: "Journal",
    description: "Notes, project stories, and production guidance.",
    body: "A future home for BRIGHTLINE notes, project stories, and production guidance.",
    ctaLabel: "Contact",
    ctaHref: "/contact",
    status: "DRAFT",
    updatedAt: new Date(0).toISOString(),
    managed: true,
    blocks: [
      coreBlock("blog_hero", {
        type: "hero",
        label: "Hero",
        eyebrow: "Journal",
        title: "BRIGHTLINE Journal",
        body: "Notes, project stories, and production guidance. Keep this page in Draft until launch.",
        ctaLabel: "Contact",
        ctaHref: "/contact",
      }),
    ],
  },
  {
    id: "core_galleries",
    slug: "galleries",
    title: "Client Galleries",
    eyebrow: "Private delivery",
    description: "Secure proofing and final delivery for BRIGHTLINE clients.",
    body: "Enter your private access code to review proofs, make selections, download web-ready and high-resolution files, and view project video delivery.",
    ctaLabel: "Enter gallery",
    ctaHref: "/galleries",
    status: "DRAFT",
    updatedAt: new Date(0).toISOString(),
    managed: true,
    blocks: [
      coreBlock("galleries_hero", {
        type: "gallery",
        label: "Gallery",
        eyebrow: "Private delivery",
        title: "Secure image and video delivery.",
        body: "Client galleries are protected by access code. Once inside, your team can review proofs, favorite/select images, download low-res web files, download high-res originals, and access project video assets.",
        ctaLabel: "Enter gallery",
        ctaHref: "/galleries",
      }),
      coreBlock("galleries_process", {
        type: "cards",
        label: "Delivery promise",
        eyebrow: "What to expect",
        title: "A cleaner handoff after every shoot.",
        body: "Every delivery is organized around how your team will use the assets.",
        items: [
          {
            title: "Private access",
            body: "Each gallery opens only with a unique access code.",
            meta: "Secure client portal",
          },
          {
            title: "Low + high-res",
            body: "Download web-ready files for quick publishing and high-resolution files for print, press, and archive.",
            meta: "Structured delivery",
          },
          {
            title: "Video included",
            body: "Project video files live alongside the gallery when included in the delivery.",
            meta: "Image + motion",
          },
        ],
      }),
    ],
  },
  {
    id: "core_contact",
    slug: "contact",
    title: "Contact",
    eyebrow: "Contact",
    description: "Share your project details and timeline.",
    body: "We respond within 24 hours.",
    ctaLabel: "View work",
    ctaHref: "/work",
    status: "DRAFT",
    updatedAt: new Date(0).toISOString(),
    managed: true,
    blocks: [
      coreBlock("contact_hero", {
        type: "hero",
        label: "Hero",
        eyebrow: "Contact",
        title: "Contact",
        body: "Share your project details and timeline. We respond within 24 hours.",
      }),
      coreBlock("contact_form", {
        type: "contactForm",
        label: "Contact form",
        eyebrow: "Studio contact",
        title: "Let's talk details.",
        body: "Email to discuss timelines, scope, and usage needs.",
        ctaLabel: "View work",
        ctaHref: "/work",
      }),
    ],
  },
];

export function blankWebsitePage(title = "New Page"): WebsitePage {
  const slug = slugify(title) || "new-page";
  return {
    id: newId(),
    slug,
    title,
    eyebrow: "BRIGHTLINE Photography",
    description: "Short page introduction.",
    body: "Write the page content here.",
    ctaLabel: "Contact",
    ctaHref: "/contact",
    status: "DRAFT",
    updatedAt: new Date().toISOString(),
    blocks: [
      coreBlock(newId("block"), {
        type: "hero",
        label: "Hero",
        eyebrow: "BRIGHTLINE Photography",
        title,
        body: "Short page introduction.",
        ctaLabel: "Contact",
        ctaHref: "/contact",
      }),
    ],
  };
}

function normalizeItems(raw: unknown): WebsiteBlockItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const title = typeof row.title === "string" ? row.title.trim() : "";
      const body = typeof row.body === "string" ? row.body.trim() : "";
      const meta = typeof row.meta === "string" ? row.meta.trim() : "";
      const mediaUrl = typeof row.mediaUrl === "string" ? resolveStoredMediaUrl(row.mediaUrl) : "";
      return title || body || meta || mediaUrl ? { title, body, ...(meta ? { meta } : {}), ...(mediaUrl ? { mediaUrl } : {}) } : null;
    })
    .filter(Boolean) as WebsiteBlockItem[];
}

function normalizeBlock(input: unknown): WebsiteBlock | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const type: WebsiteBlockType =
    row.type === "hero" ||
    row.type === "gallery" ||
    row.type === "stats" ||
    row.type === "text" ||
    row.type === "cards" ||
    row.type === "list" ||
    row.type === "cta" ||
    row.type === "contactForm"
      ? row.type
      : "text";

  return {
    id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : newId("block"),
    type,
    label: typeof row.label === "string" && row.label.trim() ? row.label.trim() : "Content block",
    eyebrow: typeof row.eyebrow === "string" ? row.eyebrow.trim() : "",
    title: typeof row.title === "string" ? row.title.trim() : "",
    body: typeof row.body === "string" ? row.body.trim() : "",
    mediaUrl: typeof row.mediaUrl === "string" ? resolveStoredMediaUrl(row.mediaUrl) : "",
    posterUrl: typeof row.posterUrl === "string" ? resolveStoredMediaUrl(row.posterUrl) : "",
    items: normalizeItems(row.items),
    ctaLabel: typeof row.ctaLabel === "string" ? row.ctaLabel.trim() : "",
    ctaHref: typeof row.ctaHref === "string" ? row.ctaHref.trim() : "",
    ...(type === "hero" ? { showcaseEnabled: row.showcaseEnabled !== false } : {}),
  };
}

export function normalizeWebsitePage(input: unknown): WebsitePage | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const title = typeof row.title === "string" && row.title.trim() ? row.title.trim() : "Untitled Page";
  const slug = slugify(typeof row.slug === "string" ? row.slug : title);
  if (!slug) return null;
  const status = row.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
  const blocks = Array.isArray(row.blocks)
    ? row.blocks.map(normalizeBlock).filter(Boolean) as WebsiteBlock[]
    : [];

  return {
    id: typeof row.id === "string" && row.id.trim() ? row.id.trim() : newId(),
    slug,
    title,
    eyebrow: typeof row.eyebrow === "string" ? row.eyebrow.trim() : "",
    description: typeof row.description === "string" ? row.description.trim() : "",
    body: typeof row.body === "string" ? row.body.trim() : "",
    ctaLabel: typeof row.ctaLabel === "string" ? row.ctaLabel.trim() : "",
    ctaHref: typeof row.ctaHref === "string" ? row.ctaHref.trim() : "",
    status,
    updatedAt: new Date().toISOString(),
    blocks,
    managed: Boolean(row.managed),
  };
}

function normalizePages(input: unknown): WebsitePage[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  return input
    .map(normalizeWebsitePage)
    .filter((page): page is WebsitePage => {
      if (!page || seen.has(page.slug)) return false;
      seen.add(page.slug);
      return true;
    });
}

export async function getWebsitePages(): Promise<WebsitePage[]> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: WEBSITE_PAGES_SETTING_KEY },
      select: { value: true },
    });
    if (!setting?.value) return [];
    return normalizePages(JSON.parse(setting.value));
  } catch {
    return [];
  }
}

export async function getWebsitePagesForAdmin(): Promise<WebsitePage[]> {
  const saved = await getWebsitePages();
  const mergedCore = CORE_WEBSITE_PAGES.map((corePage) => {
    const savedPage = saved.find((page) => page.id === corePage.id || page.slug === corePage.slug);
    return savedPage
      ? { ...corePage, ...savedPage, blocks: savedPage.blocks.length ? savedPage.blocks : corePage.blocks, managed: true }
      : corePage;
  });
  const custom = saved.filter(
    (page) => !CORE_WEBSITE_PAGES.some((corePage) => corePage.id === page.id || corePage.slug === page.slug)
  );
  return [...mergedCore, ...custom];
}

/**
 * Merges core defaults with DB (same as admin) so published core pages like `contact`
 * resolve the full block list and media, not only a partial saved array.
 */
export const getPublishedWebsitePageBySlug = cache(async (slug: string) => {
  const normalizedSlug = slugify(slug);
  const pages = await getWebsitePagesForAdmin();
  return (
    pages.find((page) => page.slug === normalizedSlug && page.status === "PUBLISHED") ??
    null
  );
});

/** Page background for public routes (prefers dedicated gallery block, then hero, then any block with media). */
export function getBackgroundMediaFromPage(page: WebsitePage | null) {
  if (!page) return { media: null as string | null, poster: null as string | null };
  const withMedia =
    page.blocks.find(
      (b) => b.type === "gallery" && (b.mediaUrl?.trim() || b.posterUrl?.trim())
    ) ||
    page.blocks.find(
      (b) => b.type === "hero" && (b.mediaUrl?.trim() || b.posterUrl?.trim())
    ) ||
    page.blocks.find((b) => b.mediaUrl?.trim() || b.posterUrl?.trim());
  if (!withMedia) return { media: null, poster: null };
  return {
    media: withMedia.mediaUrl?.trim() || null,
    poster: withMedia.posterUrl?.trim() || null,
  };
}

export async function saveWebsitePages(input: unknown): Promise<WebsitePage[]> {
  const pages = normalizePages(input);
  await prisma.siteSetting.upsert({
    where: { key: WEBSITE_PAGES_SETTING_KEY },
    update: { value: JSON.stringify(pages) },
    create: { key: WEBSITE_PAGES_SETTING_KEY, value: JSON.stringify(pages) },
  });
  return pages;
}
