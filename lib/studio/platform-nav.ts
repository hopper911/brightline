export const STUDIO_PLATFORM_NAV = [
  {
    id: "content",
    label: "Content",
    href: "/studio/content",
    description: "Platform content listings by tenant",
  },
  {
    id: "content-brightline",
    label: "Brightline content",
    href: "/studio/content/brightline",
    parent: "content",
  },
  {
    id: "content-mirotech",
    label: "MiroTech content",
    href: "/studio/content/mirotech",
    parent: "content",
  },
  {
    id: "media",
    label: "Media",
    href: "/studio/media",
    description: "Asset registry browser",
  },
  {
    id: "publishing",
    label: "Publishing",
    href: "/studio/publishing",
    description: "Publish jobs and distribution status",
  },
  {
    id: "activity",
    label: "Activity",
    href: "/studio/activity",
    description: "Audit trail and system status",
  },
  {
    id: "ops",
    label: "Studio ops",
    href: "/studio/ops",
    description: "Operational probes and admin links",
  },
] as const;
