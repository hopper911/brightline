import { prisma } from "@/lib/prisma";

export type AdminNavItem = {
  id: string;
  label: string;
  href: string;
  visible: boolean;
};

export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_SETTING_KEY = "admin_navigation:v1";

/** Removed from sidebar — use R2 storage instead. */
export const DEPRECATED_ADMIN_NAV_ITEM_IDS = new Set(["image_port", "video_port"]);

export const DEFAULT_ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "operate",
    label: "Operate",
    items: [
      { id: "studio", label: "Mission Control", href: "/studio", visible: true },
      { id: "studio_ops", label: "Studio ops", href: "/studio/ops", visible: true },
      { id: "studio_tasks", label: "Tasks", href: "/studio/tasks", visible: true },
      { id: "studio_calendar", label: "Calendar", href: "/studio/calendar", visible: true },
      { id: "finance", label: "Finance", href: "/studio/finance", visible: true },
      { id: "studio_leads", label: "Studio leads", href: "/admin/studio-leads", visible: true },
      { id: "clients", label: "Clients", href: "/admin/clients", visible: true },
      { id: "automations", label: "Automations", href: "/admin/automations", visible: true },
    ],
  },
  {
    id: "publish",
    label: "Publish",
    items: [
      { id: "website_pages", label: "Website pages", href: "/admin/pages", visible: true },
      { id: "hero_showcase", label: "Hero showcase", href: "/admin/hero-showcase", visible: true },
      { id: "blog", label: "Blog", href: "/admin/blog", visible: true },
      { id: "service_pages", label: "Service pages", href: "/admin/services", visible: true },
      { id: "service_sections", label: "Service sections", href: "/admin/service-sections", visible: true },
      { id: "work_sections", label: "Work sections", href: "/admin/work-sections", visible: true },
      { id: "work", label: "Work", href: "/admin/work", visible: true },
      { id: "work_pillars", label: "Work pillars", href: "/admin/work-pillars", visible: true },
      { id: "design", label: "Design", href: "/admin/design", visible: true },
      { id: "studio_cms", label: "Studio CMS", href: "/admin/studio-cms", visible: true },
      { id: "studio_delivery", label: "Studio delivery", href: "/admin/projects", visible: true },
      { id: "portfolio", label: "Portfolio", href: "/admin/portfolio", visible: true },
    ],
  },
  {
    id: "deliver",
    label: "Deliver",
    items: [
      {
        id: "client_deliveries",
        label: "Client deliveries",
        href: "/admin/delivery",
        visible: true,
      },
      {
        id: "gallery_delivery",
        label: "Gallery delivery",
        href: "/admin/galleries",
        visible: true,
      },
      { id: "access_codes", label: "Access codes", href: "/admin/client-access", visible: true },
      {
        id: "download_activity",
        label: "Download activity",
        href: "/admin/gallery-activity",
        visible: true,
      },
      {
        id: "video_deliveries",
        label: "Video deliveries",
        href: "/admin/gallery-videos",
        visible: true,
      },
      {
        id: "delivery_settings",
        label: "Delivery settings",
        href: "/admin/delivery-settings",
        visible: true,
      },
    ],
  },
  {
    id: "assets",
    label: "Assets",
    items: [
      { id: "media", label: "Media", href: "/admin/media", visible: true },
      {
        id: "background_videos",
        label: "Background videos",
        href: "/admin/background-videos",
        visible: true,
      },
      { id: "r2_storage", label: "R2 storage", href: "/admin/r2", visible: true },
    ],
  },
  {
    id: "mirotech",
    label: "Mirotech",
    items: [
      { id: "mirotech_hub", label: "Mirotech hub", href: "/admin/mirotech", visible: true },
      {
        id: "mirotech_dashboard",
        label: "Dashboard",
        href: "/api/admin/mirotech/handoff?next=/admin",
        visible: true,
      },
      {
        id: "mirotech_projects",
        label: "Projects",
        href: "/api/admin/mirotech/handoff?next=/admin/projects",
        visible: true,
      },
      {
        id: "mirotech_journal",
        label: "Journal",
        href: "/api/admin/mirotech/handoff?next=/admin/journal",
        visible: true,
      },
      {
        id: "mirotech_media_command",
        label: "Media command center",
        href: "/admin/mirotech-media",
        visible: true,
      },
      {
        id: "mirotech_media",
        label: "Media (Mirotech site)",
        href: "/api/admin/mirotech/handoff?next=/admin/media",
        visible: true,
      },
      {
        id: "mirotech_site",
        label: "View site",
        href: "https://mirotech.solutions",
        visible: true,
      },
    ],
  },
  {
    id: "insight",
    label: "Insight",
    items: [
      { id: "business", label: "Business", href: "/admin/business", visible: true },
      { id: "analytics", label: "Analytics", href: "/admin/analytics", visible: true },
      { id: "settings", label: "Settings", href: "/admin/settings", visible: true },
      { id: "sidebar", label: "Admin sidebar", href: "/admin/navigation", visible: true },
    ],
  },
  {
    id: "legacy",
    label: "Legacy",
    items: [
      { id: "leads", label: "Leads (legacy)", href: "/admin/leads", visible: true },
      { id: "tags", label: "Tags", href: "/admin/tags", visible: true },
      { id: "testimonials", label: "Testimonials", href: "/admin/testimonials", visible: true },
    ],
  },
];

function cleanHref(value: unknown) {
  const href = typeof value === "string" ? value.trim() : "";
  if (!href) return "";
  if (href.startsWith("/") || href.startsWith("https://") || href.startsWith("http://")) {
    return href;
  }
  return `/${href.replace(/^\/+/, "")}`;
}

function normalizeItem(input: unknown, fallback: AdminNavItem): AdminNavItem {
  if (!input || typeof input !== "object") return fallback;
  const row = input as Record<string, unknown>;
  const label =
    typeof row.label === "string" && row.label.trim() ? row.label.trim() : fallback.label;
  const href = cleanHref(row.href) || fallback.href;
  const visible = typeof row.visible === "boolean" ? row.visible : fallback.visible;
  return { ...fallback, label, href, visible };
}

function normalizeGroup(input: unknown, fallback: AdminNavGroup): AdminNavGroup {
  if (!input || typeof input !== "object") return fallback;
  const row = input as Record<string, unknown>;
  const label =
    typeof row.label === "string" && row.label.trim() ? row.label.trim() : fallback.label;
  const rawItems = row.items;
  if (!Array.isArray(rawItems)) {
    return { ...fallback, label };
  }

  const savedIds = new Set<string>();
  for (const entry of rawItems) {
    if (!entry || typeof entry !== "object") continue;
    const rid = typeof (entry as { id?: unknown }).id === "string" ? String((entry as { id: string }).id).trim() : "";
    if (rid) savedIds.add(rid);
  }

  const items: AdminNavItem[] = fallback.items.map((fb) => {
    const saved = rawItems.find(
      (e) =>
        e &&
        typeof e === "object" &&
        typeof (e as { id?: unknown }).id === "string" &&
        String((e as { id: string }).id).trim() === fb.id
    );
    return saved ? normalizeItem(saved, fb) : fb;
  });

  const defaultIds = new Set(fallback.items.map((i) => i.id));
  for (const entry of rawItems) {
    if (!entry || typeof entry !== "object") continue;
    const rid = typeof (entry as { id?: unknown }).id === "string" ? String((entry as { id: string }).id).trim() : "";
    if (!rid || defaultIds.has(rid) || DEPRECATED_ADMIN_NAV_ITEM_IDS.has(rid)) continue;
    items.push(
      normalizeItem(entry, {
        id: rid,
        label: "Link",
        href: "/admin",
        visible: true,
      })
    );
  }

  return { ...fallback, label, items };
}

export function normalizeAdminNavGroups(input: unknown): AdminNavGroup[] {
  if (!Array.isArray(input)) {
    return DEFAULT_ADMIN_NAV_GROUPS;
  }

  const out: AdminNavGroup[] = [];
  const consumed = new Set<string>();

  for (const fg of DEFAULT_ADMIN_NAV_GROUPS) {
    const hit = input.find((g) => g && typeof g === "object" && (g as { id?: unknown }).id === fg.id);
    const merged = normalizeGroup(hit, fg);
    out.push(merged);
    consumed.add(fg.id);
  }

  for (const g of input) {
    if (!g || typeof g !== "object") continue;
    const id = typeof (g as { id?: unknown }).id === "string" ? (g as { id: string }).id.trim() : "";
    if (!id || consumed.has(id)) continue;
    const label = typeof (g as { label?: unknown }).label === "string" ? (g as { label: string }).label.trim() : "Links";
    const items: AdminNavItem[] = [];
    if (Array.isArray((g as { items?: unknown }).items)) {
      for (const entry of (g as { items: unknown[] }).items) {
        if (!entry || typeof entry !== "object") continue;
        const oid = typeof (entry as { id?: unknown }).id === "string" ? (entry as { id: string }).id.trim() : "";
        if (!oid) continue;
        items.push(
          normalizeItem(entry, {
            id: oid,
            label: "Link",
            href: "/admin",
            visible: true,
          })
        );
      }
    }
    if (items.length === 0) continue;
    out.push({ id, label, items });
    consumed.add(id);
  }

  return out.length ? out : DEFAULT_ADMIN_NAV_GROUPS;
}

export async function getAdminNav(): Promise<AdminNavGroup[]> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: ADMIN_NAV_SETTING_KEY },
      select: { value: true },
    });
    if (!setting?.value) return DEFAULT_ADMIN_NAV_GROUPS;
    return normalizeAdminNavGroups(JSON.parse(setting.value));
  } catch {
    return DEFAULT_ADMIN_NAV_GROUPS;
  }
}

export async function saveAdminNavGroups(input: unknown): Promise<AdminNavGroup[]> {
  const normalized = normalizeAdminNavGroups(input);
  await prisma.siteSetting.upsert({
    where: { key: ADMIN_NAV_SETTING_KEY },
    update: { value: JSON.stringify(normalized) },
    create: { key: ADMIN_NAV_SETTING_KEY, value: JSON.stringify(normalized) },
  });
  return normalized;
}
