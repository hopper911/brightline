import type { PlatformPermission } from "@/lib/platform/authorization/permissions";
import type { StudioOpsNavItem, StudioOpsSectionId, StudioOpsToolLink } from "@/lib/studio/ops/types";

export const STUDIO_OPS_TENANT_COOKIE = "studio_ops_tenant";

export const STUDIO_OPS_NAV: StudioOpsNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/studio/ops",
    description: "Operational control plane home",
  },
  {
    id: "brightline",
    label: "Brightline",
    href: "/studio/ops/brightline",
    description: "Brightline brand admin surfaces",
  },
  {
    id: "mirotech",
    label: "MiroTech",
    href: "/studio/ops/mirotech",
    description: "Mirotech brand admin surfaces",
  },
  {
    id: "content",
    label: "Content",
    href: "/studio/ops/content",
    description: "CMS, work, journal, and hub content",
  },
  {
    id: "media",
    label: "Media",
    href: "/studio/ops/media",
    description: "Libraries, R2, and dual-brand media tools",
  },
  {
    id: "publishing",
    label: "Publishing",
    href: "/studio/ops/publishing",
    description: "Distribution, sync, and publish pipelines",
  },
  {
    id: "system",
    label: "System",
    href: "/studio/ops/system",
    description: "Identity, SSO, flags, and platform status",
  },
];

const SECTION_REQUIRED_PERMISSIONS: Partial<Record<StudioOpsSectionId, PlatformPermission[]>> = {
  brightline: ["brightline.journal.read"],
  mirotech: ["mirotech.project.read"],
  content: ["brightline.journal.read", "mirotech.journal.read"],
  media: ["platform.media.read"],
  publishing: ["brightline.journal.publish", "mirotech.journal.publish"],
  system: ["platform.identity.read"],
};

export function studioOpsSectionVisible(
  sectionId: StudioOpsSectionId,
  permissions: PlatformPermission[],
  legacyAdmin: boolean
): boolean {
  if (sectionId === "overview") return true;
  if (legacyAdmin) return true;
  const required = SECTION_REQUIRED_PERMISSIONS[sectionId];
  if (!required?.length) return true;
  return required.some((p) => permissions.includes(p));
}

export const BRIGHTLINE_OPS_LINKS: StudioOpsToolLink[] = [
  {
    label: "Mission Control",
    description: "Studio priorities, finance snapshot, alerts",
    href: "/studio",
  },
  {
    label: "Brightline admin home",
    description: "Legacy Mission Control dashboard at /admin",
    href: "/admin",
  },
  {
    label: "Work & case studies",
    description: "Brightline portfolio pillars and project editor",
    href: "/admin/work",
    permission: "brightline.journal.read",
  },
  {
    label: "Blog / journal",
    description: "Brightline journal posts and shared hub entries",
    href: "/admin/blog",
    permission: "brightline.journal.read",
  },
  {
    label: "Website pages",
    description: "Public marketing page CMS",
    href: "/admin/pages",
  },
  {
    label: "Client delivery",
    description: "Galleries, packages, and client access",
    href: "/admin/delivery",
    permission: "brightline.gallery.read",
  },
];

export const MIROTECH_OPS_LINKS: StudioOpsToolLink[] = [
  {
    label: "Mirotech hub",
    description: "Handoff launcher and remote admin entry points",
    href: "/admin/mirotech",
    permission: "mirotech.project.read",
  },
  {
    label: "Mirotech dashboard (SSO)",
    description: "Cross-domain staff SSO when configured",
    href: "/api/admin/platform/sso/start?target=mirotech&returnTo=/admin",
    permission: "mirotech.project.read",
  },
  {
    label: "Mirotech dashboard (handoff)",
    description: "Legacy ho1 handoff fallback",
    href: "/api/admin/mirotech/handoff?next=/admin",
    permission: "mirotech.project.read",
  },
  {
    label: "Media command center",
    description: "Mirotech R2 audit and reorg tools on Brightline",
    href: "/admin/mirotech-media",
    permission: "platform.media.read",
  },
  {
    label: "Public site",
    description: "mirotech.solutions",
    href: "https://mirotech.solutions",
    external: true,
  },
];

export const CONTENT_OPS_LINKS: StudioOpsToolLink[] = [
  {
    label: "Studio Hub",
    description: "Dual-brand hub projects (Work + Journal distribution)",
    href: "/admin/studio-cms",
    permission: "brightline.journal.read",
  },
  {
    label: "Brightline work",
    description: "Architecture, corporate, and shared work editor",
    href: "/admin/work",
    permission: "brightline.journal.read",
  },
  {
    label: "Design portfolio",
    description: "Design pillar case studies",
    href: "/admin/design",
    permission: "brightline.journal.read",
  },
  {
    label: "Brightline blog",
    description: "Journal and shared blog distribution",
    href: "/admin/blog",
    permission: "brightline.journal.read",
  },
  {
    label: "Mirotech journal (remote)",
    description: "Remote CMS via handoff",
    href: "/api/admin/mirotech/handoff?next=/admin/journal",
    permission: "mirotech.journal.read",
  },
];

export const MEDIA_OPS_LINKS: StudioOpsToolLink[] = [
  {
    label: "Unified media library",
    description: "Brightline media registry and attachments",
    href: "/admin/media",
    permission: "platform.media.read",
  },
  {
    label: "R2 storage manager",
    description: "Brightline vault browse, upload, and move",
    href: "/admin/r2",
    permission: "platform.media.read",
  },
  {
    label: "Background videos",
    description: "Hero and page background video CMS",
    href: "/admin/background-videos",
    permission: "platform.media.read",
  },
  {
    label: "Mirotech media command center",
    description: "Mirotech vault tools from Brightline admin",
    href: "/admin/mirotech-media",
    permission: "platform.media.read",
  },
  {
    label: "Portfolio curation",
    description: "Web thumb and portfolio asset curation",
    href: "/admin/portfolio",
    permission: "platform.media.read",
  },
];

export const PUBLISHING_OPS_LINKS: StudioOpsToolLink[] = [
  {
    label: "Studio Hub projects",
    description: "Dual-brand publish and distribution controls",
    href: "/admin/studio-cms",
    permission: "brightline.journal.publish",
  },
  {
    label: "Blog / journal admin",
    description: "Async Mirotech journal sync when jobs enabled",
    href: "/admin/blog",
    permission: "brightline.journal.publish",
  },
  {
    label: "Mirotech sync status",
    description: "API probe for remote journal sync configuration",
    href: "/api/admin/mirotech/sync-status",
    permission: "mirotech.journal.publish",
  },
  {
    label: "Studio delivery projects",
    description: "Client-facing delivery and package publishing",
    href: "/admin/projects",
    permission: "brightline.gallery.write",
  },
];

export const SYSTEM_OPS_LINKS: StudioOpsToolLink[] = [
  {
    label: "Platform health (extended)",
    description: "DB liveness + feature flags — no secrets exposed",
    href: "/api/admin/platform/health",
    permission: "platform.identity.read",
  },
  {
    label: "Platform metrics (24h)",
    description: "Jobs, SSO audit counts, asset read counters",
    href: "/api/admin/platform/metrics",
    permission: "platform.identity.read",
  },
  {
    label: "Public liveness",
    description: "Unauthenticated GET /api/platform/health for uptime checks",
    href: "/api/platform/health",
    permission: "platform.identity.read",
  },
  {
    label: "SSO status",
    description: "Parallel staff SSO availability probe",
    href: "/api/admin/platform/sso/status",
    permission: "platform.identity.read",
  },
  {
    label: "Identity probe",
    description: "PlatformUser mapping for current session",
    href: "/api/admin/platform/identity/me",
    permission: "platform.identity.read",
  },
  {
    label: "Authorization probe",
    description: "Effective permissions for active tenant",
    href: "/api/admin/platform/authorization/me?tenant=brightline",
    permission: "platform.identity.read",
  },
  {
    label: "Admin settings",
    description: "Site settings and integration configuration",
    href: "/admin/settings",
  },
  {
    label: "Admin navigation editor",
    description: "Customize legacy admin sidebar",
    href: "/admin/navigation",
  },
];

export function filterOpsLinks(
  links: StudioOpsToolLink[],
  permissions: PlatformPermission[],
  legacyAdmin: boolean
): StudioOpsToolLink[] {
  if (legacyAdmin) return links;
  return links.filter((link) => !link.permission || permissions.includes(link.permission));
}
