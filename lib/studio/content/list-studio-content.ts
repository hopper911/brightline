import "server-only";

import { createPlatformContextForTenant } from "@/lib/platform/context/types";
import { defaultContentService } from "@/lib/platform/content/default-content-service";
import { ContentUnsupportedTypeError } from "@/lib/platform/content/errors";
import type { ContentListResult, ContentReferenceSummary, ContentType } from "@/lib/platform/content/types";
import { isPlatformFeatureEnabled } from "@/lib/platform/features";
import type { TenantSlug } from "@/lib/platform/tenants/types";

export const BRIGHTLINE_STUDIO_CONTENT_TYPES = ["work-project", "portfolio-project"] as const;
export const MIROTECH_STUDIO_CONTENT_TYPES = ["dual-brand-work", "mirotech-case-study"] as const;

export type StudioContentSection = {
  type: ContentType;
  label: string;
  result: ContentListResult;
  supported: boolean;
  error?: string;
};

export type StudioContentListing = {
  tenant: TenantSlug;
  enabled: boolean;
  sections: StudioContentSection[];
};

const TYPE_LABELS: Record<string, string> = {
  "work-project": "Work projects",
  "portfolio-project": "Portfolio projects",
  "dual-brand-work": "Studio Hub projects",
  "mirotech-case-study": "Mirotech case studies",
};

async function listType(
  tenant: TenantSlug,
  type: ContentType,
  options?: { limit?: number; cursor?: string }
): Promise<StudioContentSection> {
  const context = createPlatformContextForTenant(tenant);
  try {
    const result = await defaultContentService.listPublished(context, type, options);
    return {
      type,
      label: TYPE_LABELS[type] ?? type,
      result,
      supported: true,
    };
  } catch (error) {
    if (error instanceof ContentUnsupportedTypeError) {
      return {
        type,
        label: TYPE_LABELS[type] ?? type,
        result: { items: [] },
        supported: false,
        error: error.message,
      };
    }
    throw error;
  }
}

export async function listStudioContentForTenant(
  tenant: TenantSlug,
  options?: { limit?: number; cursor?: string }
): Promise<StudioContentListing> {
  if (!isPlatformFeatureEnabled("content")) {
    return { tenant, enabled: false, sections: [] };
  }

  const types =
    tenant === "brightline"
      ? (BRIGHTLINE_STUDIO_CONTENT_TYPES as readonly ContentType[])
      : (MIROTECH_STUDIO_CONTENT_TYPES as readonly ContentType[]);

  const sections = await Promise.all(types.map((type) => listType(tenant, type, options)));
  return { tenant, enabled: true, sections };
}

export function flattenStudioContentItems(sections: StudioContentSection[]): ContentReferenceSummary[] {
  return sections.flatMap((section) => section.result.items);
}
