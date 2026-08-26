import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getPublicR2Url } from "@/lib/r2";

export const PAGE_BACKGROUNDS_SETTING_KEY = "page_backgrounds:v1";

/** Core hub keys (no slug). */
export const PAGE_BACKGROUND_HUBS = [
  { key: "home", label: "Home", path: "/" },
  { key: "about", label: "About", path: "/about" },
  { key: "work", label: "Work", path: "/work" },
  { key: "blog", label: "Blog", path: "/blog" },
  { key: "travel", label: "Travel", path: "/travel" },
  { key: "galleries", label: "Galleries", path: "/galleries" },
  { key: "services", label: "Services", path: "/services" },
  { key: "contact", label: "Contact", path: "/contact" },
  { key: "design", label: "Design", path: "/design" },
  { key: "process", label: "Process", path: "/process" },
] as const;

export type PageBackgroundHubKey = (typeof PAGE_BACKGROUND_HUBS)[number]["key"];

/** Map of pageKey → SiteBackgroundVideo.id */
export type PageBackgroundMap = Record<string, string>;

export type ResolvedPageBackgroundMedia = {
  enabled: boolean;
  media: string;
  poster: string;
  videoId: string | null;
  title: string | null;
  pageKey: string;
};

function mediaUrl(input: string | null | undefined): string {
  const value = input?.trim() ?? "";
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value) || value.startsWith("/")) return value;
  return getPublicR2Url(value.replace(/^\/+/, ""));
}

function slugPart(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function pageKeyHub(hub: PageBackgroundHubKey): string {
  return hub;
}

export function pageKeyBlogPost(slug: string): string {
  return `blog:${slugPart(slug)}`;
}

export function pageKeyTravelPost(slug: string): string {
  return `travel:${slugPart(slug)}`;
}

export function pageKeyWorkSection(section: string): string {
  return `work:${slugPart(section)}`;
}

export function pageKeyWorkProject(slug: string): string {
  return `work-project:${slugPart(slug)}`;
}

export function pageKeyService(slug: string): string {
  return `services:${slugPart(slug)}`;
}

export function pageKeyDesign(slug: string): string {
  return `design:${slugPart(slug)}`;
}

/** Normalize a free-form assignment key (hub or nested). */
export function normalizePageBackgroundKey(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (!value) return "";
  const colon = value.indexOf(":");
  if (colon === -1) {
    const hub = PAGE_BACKGROUND_HUBS.find((h) => h.key === value);
    return hub ? hub.key : slugPart(value);
  }
  const prefix = value.slice(0, colon).trim();
  const rest = slugPart(value.slice(colon + 1));
  if (!rest) return "";
  if (
    prefix === "blog" ||
    prefix === "travel" ||
    prefix === "work" ||
    prefix === "work-project" ||
    prefix === "services" ||
    prefix === "design"
  ) {
    return `${prefix}:${rest}`;
  }
  return `${slugPart(prefix)}:${rest}`;
}

export function labelForPageBackgroundKey(key: string): string {
  const hub = PAGE_BACKGROUND_HUBS.find((h) => h.key === key);
  if (hub) return hub.label;
  if (key.startsWith("blog:")) return `Blog · ${key.slice(5)}`;
  if (key.startsWith("travel:")) return `Travel · ${key.slice(7)}`;
  if (key.startsWith("work-project:")) return `Work project · ${key.slice(13)}`;
  if (key.startsWith("work:")) return `Work · ${key.slice(5)}`;
  if (key.startsWith("services:")) return `Services · ${key.slice(9)}`;
  if (key.startsWith("design:")) return `Design · ${key.slice(7)}`;
  return key;
}

export function pathForPageBackgroundKey(key: string): string {
  const hub = PAGE_BACKGROUND_HUBS.find((h) => h.key === key);
  if (hub) return hub.path;
  if (key.startsWith("blog:")) return `/blog/${key.slice(5)}`;
  if (key.startsWith("travel:")) return `/travel/${key.slice(7)}`;
  if (key.startsWith("work-project:")) return `/work/${key.slice(13)}`; // best-effort; pillar path unknown
  if (key.startsWith("work:")) return `/work/${key.slice(5)}`;
  if (key.startsWith("services:")) return `/services/${key.slice(9)}`;
  if (key.startsWith("design:")) return `/design/${key.slice(7)}`;
  return "/";
}

export function normalizePageBackgroundMap(input: unknown): PageBackgroundMap {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: PageBackgroundMap = {};
  for (const [rawKey, rawVal] of Object.entries(input as Record<string, unknown>)) {
    const key = normalizePageBackgroundKey(rawKey);
    const videoId = typeof rawVal === "string" ? rawVal.trim() : "";
    if (!key || !videoId) continue;
    out[key] = videoId;
  }
  return out;
}

export const getPageBackgroundMap = cache(async (): Promise<PageBackgroundMap> => {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: PAGE_BACKGROUNDS_SETTING_KEY },
      select: { value: true },
    });
    if (!setting?.value) return {};
    return normalizePageBackgroundMap(JSON.parse(setting.value));
  } catch {
    return {};
  }
});

export async function savePageBackgroundMap(input: unknown): Promise<PageBackgroundMap> {
  const map = normalizePageBackgroundMap(input);
  await prisma.siteSetting.upsert({
    where: { key: PAGE_BACKGROUNDS_SETTING_KEY },
    update: { value: JSON.stringify(map) },
    create: { key: PAGE_BACKGROUNDS_SETTING_KEY, value: JSON.stringify(map) },
  });
  return map;
}

export async function setPageBackgroundAssignment(
  pageKeyRaw: string,
  videoId: string | null
): Promise<PageBackgroundMap> {
  const pageKey = normalizePageBackgroundKey(pageKeyRaw);
  if (!pageKey) throw new Error("Invalid page key.");
  const map = { ...(await getPageBackgroundMap()) };
  if (!videoId?.trim()) {
    delete map[pageKey];
  } else {
    const video = await prisma.siteBackgroundVideo.findFirst({
      where: { id: videoId.trim(), enabled: true },
      select: { id: true },
    });
    if (!video) throw new Error("Background video not found or disabled.");
    map[pageKey] = video.id;
  }
  return savePageBackgroundMap(map);
}

export const resolvePageBackgroundMedia = cache(
  async (pageKeyRaw: string): Promise<ResolvedPageBackgroundMedia> => {
    const pageKey = normalizePageBackgroundKey(pageKeyRaw);
    if (!pageKey) {
      return {
        enabled: false,
        media: "",
        poster: "",
        videoId: null,
        title: null,
        pageKey: "",
      };
    }

    try {
      const map = await getPageBackgroundMap();
      const videoId = map[pageKey];
      if (!videoId) {
        return {
          enabled: false,
          media: "",
          poster: "",
          videoId: null,
          title: null,
          pageKey,
        };
      }

      const video = await prisma.siteBackgroundVideo.findFirst({
        where: { id: videoId, enabled: true },
      });
      if (!video?.storageKey) {
        return {
          enabled: false,
          media: "",
          poster: "",
          videoId: null,
          title: null,
          pageKey,
        };
      }

      return {
        enabled: true,
        media: mediaUrl(video.webStorageKey || video.storageKey),
        poster: mediaUrl(video.posterKey),
        videoId: video.id,
        title: video.title,
        pageKey,
      };
    } catch {
      return {
        enabled: false,
        media: "",
        poster: "",
        videoId: null,
        title: null,
        pageKey,
      };
    }
  }
);

/** Props for `<PageBackground />` when a page assignment exists. */
export async function getPageBackgroundProps(pageKey: string): Promise<{
  media?: string;
  poster?: string;
  forceLocalBackground?: boolean;
} | null> {
  const resolved = await resolvePageBackgroundMedia(pageKey);
  if (!resolved.enabled || !resolved.media) return null;
  return {
    media: resolved.media,
    poster: resolved.poster || undefined,
    forceLocalBackground: true,
  };
}
