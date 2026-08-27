/**
 * Browse R2 modal — prefix plans and vault-aware pick types.
 * Client-safe (no server credentials).
 */

import { PILLAR_SLUGS } from "@/lib/portfolioPillars";
import {
  MIROTECH_PORTFOLIO_PILLAR_PREFIXES,
  MIROTECH_SITE_ALLOWED_PREFIXES,
  type R2VaultId,
} from "@/lib/r2-vaults-shared";
import {
  MIROTECH_CATEGORIES,
  LEGACY_MIROTECH_PILLARS,
  segmentLabel,
} from "@/lib/t9-media-segments";
import type { T9MediaRoot } from "@/lib/t9-media-root";

export type PortfolioFolderFilter = "all" | "web_full" | "web_thumb" | "web_video";

export type R2BrowserPick = {
  key: string;
  vault: R2VaultId;
};

export type R2BrowserListTarget = {
  prefix: string;
  vault: R2VaultId;
};

/** Curated top-level folders for Browse R2 library home. */
export type BrowseLibraryGroup = "cms" | "portfolio" | "t9" | "all" | "brightline";

export type BrowseLibraryFolder = {
  id: string;
  label: string;
  description: string;
  prefix: string;
  vault: R2VaultId;
  group: BrowseLibraryGroup;
  /** Special flat mode — not a real R2 prefix */
  special?: "all-mirotech-media";
};

export const BROWSE_LIBRARY_GROUP_LABELS: Record<BrowseLibraryGroup, string> = {
  all: "Unified",
  cms: "CMS bucket",
  portfolio: "Portfolio (Brightline)",
  t9: "T9 Mirotech",
  brightline: "Brightline pillars",
};

/** Sentinel prefix for All Mirotech media flat browse (not a real R2 path). */
export const ALL_MIROTECH_MEDIA_PREFIX = "__all_mirotech_media__/";

/**
 * Library home tiles — organized entry points instead of dumping every object.
 * Mirotech matches R2 hub unified media sources.
 */
export function browseLibraryRoots(mediaRoot: T9MediaRoot): BrowseLibraryFolder[] {
  if (mediaRoot === "mirotech") {
    const portfolioBrightline: BrowseLibraryFolder[] = [
      {
        id: "port-arc",
        label: "Architecture",
        description: "portfolio/arc/",
        prefix: "portfolio/arc/",
        vault: "brightline",
        group: "portfolio",
      },
      {
        id: "port-cam",
        label: "Campaign",
        description: "portfolio/cam/",
        prefix: "portfolio/cam/",
        vault: "brightline",
        group: "portfolio",
      },
      {
        id: "port-cor",
        label: "Corporate",
        description: "portfolio/cor/",
        prefix: "portfolio/cor/",
        vault: "brightline",
        group: "portfolio",
      },
    ];

    const portfolioMirotech: BrowseLibraryFolder[] = ["arc", "cam", "cor"].map((pillar) => ({
      id: `mport-${pillar}`,
      label: `${pillar === "arc" ? "Architecture" : pillar === "cam" ? "Campaign" : "Corporate"} (Mirotech)`,
      description: `mirotech/portfolio/${pillar}/`,
      prefix: `mirotech/portfolio/${pillar}/`,
      vault: "brightline" as R2VaultId,
      group: "portfolio" as BrowseLibraryGroup,
    }));

    const t9Categories: BrowseLibraryFolder[] = MIROTECH_CATEGORIES.map((cat) => ({
      id: `t9-${cat}`,
      label: segmentLabel("mirotech", cat),
      description: `mirotech/${cat}/`,
      prefix: `mirotech/${cat}/`,
      vault: "brightline" as R2VaultId,
      group: "t9" as BrowseLibraryGroup,
    }));

    const cmsRoots: BrowseLibraryFolder[] = [
      {
        id: "cms-projects",
        label: "CMS Projects",
        description: "Mirotech bucket · projects/",
        prefix: "projects/",
        vault: "mirotech-site",
        group: "cms",
      },
      {
        id: "cms-journal",
        label: "CMS Journal",
        description: "Mirotech bucket · journal/",
        prefix: "journal/",
        vault: "mirotech-site",
        group: "cms",
      },
      {
        id: "cms-resume",
        label: "CMS Resume",
        description: "Mirotech bucket · resume/",
        prefix: "resume/",
        vault: "mirotech-site",
        group: "cms",
      },
      {
        id: "cms-site",
        label: "CMS Site",
        description: "Backgrounds & site assets",
        prefix: "site/",
        vault: "mirotech-site",
        group: "cms",
      },
    ];

    const unified: BrowseLibraryFolder[] = [
      {
        id: "all-mirotech",
        label: "All Mirotech media",
        description: "CMS + portfolio + T9 · flat pick",
        prefix: ALL_MIROTECH_MEDIA_PREFIX,
        vault: "brightline",
        group: "all",
        special: "all-mirotech-media",
      },
    ];

    return [...portfolioBrightline, ...portfolioMirotech, ...t9Categories, ...cmsRoots, ...unified];
  }
  return [
    {
      id: "arc",
      label: "Architecture",
      description: "portfolio/arc/",
      prefix: "portfolio/arc/",
      vault: "brightline",
      group: "brightline",
    },
    {
      id: "cam",
      label: "Campaign",
      description: "portfolio/cam/",
      prefix: "portfolio/cam/",
      vault: "brightline",
      group: "brightline",
    },
    {
      id: "cor",
      label: "Corporate",
      description: "portfolio/cor/",
      prefix: "portfolio/cor/",
      vault: "brightline",
      group: "brightline",
    },
  ];
}

export function isAllMirotechMediaPrefix(prefix: string | null | undefined): boolean {
  return prefix === ALL_MIROTECH_MEDIA_PREFIX;
}

/** Last path segment for folder tiles (portfolio/cor/ → cor). */
export function folderSegmentLabel(prefix: string): string {
  const clean = prefix.replace(/^\/+|\/+$/g, "");
  if (!clean) return "Root";
  const parts = clean.split("/");
  return parts[parts.length - 1] || clean;
}

export type BrowseBreadcrumb = { label: string; prefix: string | null };

/**
 * Breadcrumbs for folder nav. `null` prefix = library home.
 * Example: Library > portfolio > cor > web_full
 */
export function browseBreadcrumbs(
  currentPrefix: string | null,
  libraryLabel = "Library"
): BrowseBreadcrumb[] {
  const crumbs: BrowseBreadcrumb[] = [{ label: libraryLabel, prefix: null }];
  if (!currentPrefix?.trim()) return crumbs;
  const clean = currentPrefix.replace(/^\/+/, "").replace(/\/$/, "");
  if (!clean) return crumbs;
  const parts = clean.split("/").filter(Boolean);
  let acc = "";
  for (const part of parts) {
    acc += `${part}/`;
    crumbs.push({ label: part, prefix: acc });
  }
  return crumbs;
}

function normalizeListPrefix(p: string): string {
  const t = p.trim().replace(/^\//, "");
  if (!t) return "";
  return t.endsWith("/") ? t : `${t}/`;
}

/**
 * When a quality folder filter is set and the current prefix is a pillar/category
 * root (…/arc/ or …/product/), prefer appending web_full/ etc. for faster picks.
 */
export function preferredQualityChildPrefix(
  prefix: string,
  folderFilter: PortfolioFolderFilter
): string | null {
  if (folderFilter === "all") return null;
  const clean = normalizeListPrefix(prefix);
  if (!clean) return null;
  // Already inside a quality folder
  if (
    clean.endsWith("/web_full/") ||
    clean.endsWith("/web_thumb/") ||
    clean.endsWith("/web_video/")
  ) {
    return null;
  }
  // portfolio/arc/ or mirotech/product/ → one segment deep under root
  const parts = clean.replace(/\/$/, "").split("/");
  if (parts.length === 2 && (parts[0] === "portfolio" || parts[0] === "mirotech")) {
    return `${clean}${folderFilter}/`;
  }
  return null;
}

/** Brightline T9 pillar codes */
export const T9_PILLAR_CODES = ["arc", "cam", "cor"] as const;

/** Maps portfolio pillar slugs to the 3-letter R2 folder names */
export const PILLAR_TO_R2_FOLDER: Record<string, string> = {
  architecture: "arc",
  advertising: "cam",
  corporate: "cor",
};

export function segmentCodesForRoot(mediaRoot: T9MediaRoot): readonly string[] {
  return mediaRoot === "mirotech" ? MIROTECH_CATEGORIES : T9_PILLAR_CODES;
}

export function resolveR2Folder(mediaRoot: T9MediaRoot, pillar: string): string {
  if (pillar === "all") return "all";
  if (mediaRoot === "mirotech") return pillar;
  return PILLAR_TO_R2_FOLDER[pillar] ?? pillar;
}

/**
 * Coerce category/pillar so the select value is always valid for the vault.
 * Invalid values (e.g. Brightline `architecture` under Mirotech) → `all`.
 */
export function coercePillarForRoot(mediaRoot: T9MediaRoot, pillar: string): string {
  const p = (pillar || "").trim().toLowerCase();
  if (!p || p === "all") return "all";
  if (mediaRoot === "mirotech") {
    if ((MIROTECH_CATEGORIES as readonly string[]).includes(p)) return p;
    if ((LEGACY_MIROTECH_PILLARS as readonly string[]).includes(p as (typeof LEGACY_MIROTECH_PILLARS)[number])) {
      return p;
    }
    return "all";
  }
  if ((PILLAR_SLUGS as readonly string[]).includes(p)) return p;
  if (p in PILLAR_TO_R2_FOLDER) return p;
  return "architecture";
}

/** Default folder when opening/switching to a vault. */
export function defaultFolderForRoot(
  mediaRoot: T9MediaRoot,
  initial?: PortfolioFolderFilter
): PortfolioFolderFilter {
  if (initial) return initial;
  // Mirotech vault shows CMS bin + T9; default mixed so site-bucket files are visible.
  return mediaRoot === "mirotech" ? "all" : "web_full";
}

/** Classic Brightline T9 prefix list (Brightline bucket only). */
export function portfolioListPrefixes(
  mediaRoot: T9MediaRoot,
  pillar: string,
  r2Folder: string,
  folderFilter: PortfolioFolderFilter
): string[] {
  const codes = segmentCodesForRoot(mediaRoot);
  if (folderFilter === "all") {
    if (pillar === "all") return [mediaRoot];
    return [`${mediaRoot}/${r2Folder}`];
  }
  if (pillar === "all") {
    // Include legacy Mirotech pillars when scanning all categories.
    const scanCodes =
      mediaRoot === "mirotech"
        ? [...MIROTECH_CATEGORIES, ...LEGACY_MIROTECH_PILLARS]
        : [...codes];
    return scanCodes.map((code) => `${mediaRoot}/${code}/${folderFilter}`);
  }
  return [`${mediaRoot}/${r2Folder}/${folderFilter}`];
}

/**
 * Build vault-aware list targets for Browse R2.
 * Mirotech vault matches R2 hub “All Mirotech site media”:
 * CMS bucket + portfolio/arc|cam|cor + T9 mirotech/.
 */
export function browseListTargets(options: {
  mediaRoot: T9MediaRoot;
  pillar: string;
  folderFilter: PortfolioFolderFilter;
  source: "portfolio" | "project" | "custom";
  customPrefix?: string;
  projectPrefix?: string;
}): R2BrowserListTarget[] {
  const { mediaRoot, source, customPrefix, projectPrefix } = options;
  const pillar = coercePillarForRoot(mediaRoot, options.pillar);
  const r2Folder = resolveR2Folder(mediaRoot, pillar);
  const folderFilter = options.folderFilter;

  if (source === "custom") {
    const p = normalizeListPrefix(customPrefix ?? "");
    if (!p) return [];
    // Custom prefixes under site CMS roots → mirotech-site when vault is Mirotech.
    if (
      mediaRoot === "mirotech" &&
      MIROTECH_SITE_ALLOWED_PREFIXES.some(
        (allowed) => p.startsWith(allowed) || p === allowed.replace(/\/$/, "")
      )
    ) {
      return [{ prefix: p, vault: "mirotech-site" }];
    }
    return [{ prefix: p, vault: "brightline" }];
  }

  if (source === "project") {
    const p = normalizeListPrefix(projectPrefix ?? "");
    if (!p) return [];
    return [{ prefix: p, vault: "brightline" }];
  }

  // Source = portfolio (T9 / vault browse)
  if (mediaRoot === "mirotech") {
    const targets: R2BrowserListTarget[] = MIROTECH_SITE_ALLOWED_PREFIXES.map((prefix) => ({
      prefix,
      vault: "mirotech-site" as const,
    }));

    // Same portfolio pillars as collectMirotechAllMedia — where CMS-referenced galleries live.
    for (const prefix of MIROTECH_PORTFOLIO_PILLAR_PREFIXES) {
      targets.push({ prefix, vault: "brightline" });
    }

    // List whole T9 tree (or one category) — quality filter applied client-side so
    // CMS-bucket keys are never excluded by web_full/web_thumb/web_video.
    if (pillar === "all") {
      targets.push({ prefix: "mirotech/", vault: "brightline" });
    } else {
      targets.push({
        prefix: normalizeListPrefix(`mirotech/${r2Folder}`),
        vault: "brightline",
      });
    }
    return targets;
  }

  // Brightline portfolio — classic T9 prefixes on Brightline bucket.
  return portfolioListPrefixes(mediaRoot, pillar, r2Folder, folderFilter).map((prefix) => ({
    prefix: normalizeListPrefix(prefix),
    vault: "brightline" as const,
  }));
}

/** Whether a T9 key matches the folder quality filter. */
export function matchesT9FolderFilter(key: string, folderFilter: PortfolioFolderFilter): boolean {
  if (folderFilter === "all") return true;
  const clean = key.replace(/^\/+/, "").toLowerCase();
  return clean.includes(`/${folderFilter}/`);
}

/**
 * Keep media after listing. Mirotech-site keys ignore T9 folder filter;
 * Brightline T9 keys under mirotech/ or portfolio/ respect it.
 */
export function filterBrowsePicks(
  picks: R2BrowserPick[],
  folderFilter: PortfolioFolderFilter,
  mediaRoot: T9MediaRoot
): R2BrowserPick[] {
  if (folderFilter === "all") return picks;
  return picks.filter((pick) => {
    if (pick.vault === "mirotech-site") return true;
    const clean = pick.key.replace(/^\/+/, "").toLowerCase();
    if (mediaRoot === "mirotech" || clean.startsWith("mirotech/") || clean.startsWith("portfolio/")) {
      return matchesT9FolderFilter(pick.key, folderFilter);
    }
    return true;
  });
}

/** Client preview URL for a browse pick. */
export function browsePreviewUrl(pick: R2BrowserPick): string {
  const clean = pick.key.replace(/^\/+/, "");
  if (!clean) return "";
  if (pick.vault === "mirotech-site") {
    const base = (
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_MIROTECH_R2_PUBLIC_URL || ""
        : ""
    ).replace(/\/$/, "");
    if (base) return `${base}/${clean}`;
    return `/api/admin/r2/sign?vault=mirotech-site&key=${encodeURIComponent(clean)}`;
  }
  if (clean.startsWith("client-galleries/")) {
    return `/api/admin/media/sign?key=${encodeURIComponent(clean)}`;
  }
  return `/api/media/public?key=${encodeURIComponent(clean)}`;
}

/**
 * Value to persist when the admin picks a Browse R2 item.
 * Mirotech CMS-bucket picks become absolute CDN URLs when configured;
 * Brightline / T9 keys stay as object keys.
 */
export function pickToStoredMediaRef(pick: R2BrowserPick): string {
  const clean = pick.key.replace(/^\/+/, "");
  if (pick.vault !== "mirotech-site") return clean;
  const base = (
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_MIROTECH_R2_PUBLIC_URL || "" : ""
  ).replace(/\/$/, "");
  if (base) return `${base}/${clean}`;
  return clean;
}

/** Deduplicate picks by vault+key. */
export function mergeBrowsePicks(picks: R2BrowserPick[]): R2BrowserPick[] {
  const seen = new Set<string>();
  const out: R2BrowserPick[] = [];
  for (const pick of picks) {
    const clean = pick.key.replace(/^\/+/, "");
    if (!clean) continue;
    const id = `${pick.vault}:${clean}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ key: clean, vault: pick.vault });
  }
  out.sort((a, b) => a.key.localeCompare(b.key) || a.vault.localeCompare(b.vault));
  return out;
}
