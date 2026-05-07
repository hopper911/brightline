import type { Prisma } from "@prisma/client";
import { DELIVERY_PRESETS, DELIVERY_FOLDER_TREE_README } from "@/lib/delivery/presets";
import { serializePackageManifest } from "@/lib/delivery/db";

type PackageWithRelations = Prisma.DeliveryPackageGetPayload<{
  include: {
    project: true;
    client: true;
    items: { include: { mediaAsset: true } };
  };
}>;

export function buildUsageNotesMarkdown(pkg: PackageWithRelations): string {
  const client = pkg.client?.companyName ?? pkg.project.client ?? "Client";
  const lines = [
    `# Usage notes — ${pkg.title}`,
    "",
    `**Project:** ${pkg.project.title}`,
    `**Client:** ${client}`,
    "",
    pkg.usageRights?.trim()
      ? "## Licensed use\n\n" + pkg.usageRights.trim()
      : "## Licensed use\n\nSee your agreement with Bright Line Photography. Assets are provided for approved marketing and communications unless otherwise stated.",
    "",
    "## Support",
    "",
    "Questions about usage or files: reply to your delivery email or contact the studio.",
    "",
    `_Generated ${new Date().toISOString()}_`,
  ];
  return lines.join("\n");
}

export function buildImageSizeGuideMarkdown(): string {
  const table = DELIVERY_PRESETS.map((p) => {
    const dims =
      p.kind === "long_edge"
        ? `${p.longEdge}px long edge`
        : `${p.width}×${p.height}px`;
    return `| ${p.label} | ${dims} | ${p.aspectRatioLabel} | ${p.folderPath} | ${p.description} |`;
  }).join("\n");

  return [
    "# Bright Line — image size guide",
    "",
    "Preset exports for client delivery packages.",
    "",
    "| Preset | Size | Aspect | Folder | Notes |",
    "|--------|------|--------|--------|-------|",
    table,
    "",
    "## Suggested folder structure",
    "",
    "```text",
    DELIVERY_FOLDER_TREE_README,
    "```",
  ].join("\n");
}

/** Rich manifest blob for `manifestJSON` — includes preset catalog + serialized package groups. */
export function buildExtendedDeliveryManifest(pkg: PackageWithRelations | null) {
  if (!pkg) return null;
  const base = serializePackageManifest(pkg);
  return {
    ...base,
    generatedAt: new Date().toISOString(),
    presets: DELIVERY_PRESETS.map((p) => ({
      id: p.id,
      label: p.label,
      folderPath: p.folderPath,
      aspectRatio: p.aspectRatioLabel,
      width: p.width ?? null,
      height: p.height ?? null,
      longEdge: p.longEdge ?? null,
      kind: p.kind,
      format: p.format,
    })),
    artifacts: {
      usageNotesMd: buildUsageNotesMarkdown(pkg),
      imageSizeGuideMd: buildImageSizeGuideMarkdown(),
      folderTree: DELIVERY_FOLDER_TREE_README,
    },
  };
}
