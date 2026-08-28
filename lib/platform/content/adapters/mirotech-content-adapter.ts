/**
 * Mirotech tenant content adapter (Phase 5B).
 * Read-only; wraps legacy Content API + Studio Hub clients via MirotechContentReadPort.
 */

import type { PlatformContext } from "@/lib/platform/context/types";
import type { ContentProvider } from "@/lib/platform/content/content-provider";
import type {
  MirotechCaseStudyStatus,
} from "@/lib/platform/content/dto/mirotech-case-study";
import {
  ContentNotFoundError,
  ContentTenantMismatchError,
  ContentUnsupportedTypeError,
} from "@/lib/platform/content/errors";
import { defaultMirotechContentReadPort } from "@/lib/platform/content/integrations/default-mirotech-content-read";
import {
  isMirotechAdapterContentType,
  mapHubProjectToDistribution,
  mapHubProjectToPublishedSnapshot,
  mapHubProjectToReferenceSummary,
  mapHubProjectToStatus,
  mapWorkProjectToPublishedSnapshot,
  mapWorkProjectToReferenceSummary,
  mapWorkProjectToStatus,
  type MirotechAdapterContentType,
} from "@/lib/platform/content/integrations/map-mirotech-content";
import type { MirotechContentReadPort } from "@/lib/platform/content/integrations/mirotech-content-read-port";
import type {
  ContentDistributionSnapshot,
  ContentListResult,
  ContentPublishedSnapshot,
  ContentRef,
  ContentReferenceSummary,
  ContentType,
} from "@/lib/platform/content/types";
import { assertValidContentRef } from "@/lib/platform/content/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

const MIROTECH_TENANT: TenantSlug = "mirotech";

export class MirotechContentAdapter implements ContentProvider {
  readonly tenant = MIROTECH_TENANT;

  constructor(private readonly readPort: MirotechContentReadPort = defaultMirotechContentReadPort) {}

  supports(ref: ContentRef): boolean {
    try {
      const valid = assertValidContentRef(ref);
      return valid.tenant === MIROTECH_TENANT && isMirotechAdapterContentType(valid.type);
    } catch {
      return false;
    }
  }

  /** Resolve metadata by ContentRef — throws on tenant/type mismatch; null when not found. */
  async resolveReference(
    _context: PlatformContext,
    ref: ContentRef
  ): Promise<ContentReferenceSummary | null> {
    const valid = this.assertMirotechRef(ref);
    return this.getByRef(valid);
  }

  /** Published snapshot for Mirotech public surfaces — null when draft or not found. */
  async getPublished(
    _context: PlatformContext,
    ref: ContentRef
  ): Promise<ContentPublishedSnapshot | null> {
    const valid = this.assertMirotechRef(ref);
    if (valid.type === "mirotech-case-study") {
      const project = await this.readPort.getMirotechWorkBySlug(valid.id);
      if (!project) return null;
      return mapWorkProjectToPublishedSnapshot(valid, project);
    }

    const hub = await this.readPort.getHubProjectById(valid.id);
    if (!hub) return null;
    return mapHubProjectToPublishedSnapshot(valid, hub);
  }

  /** Cross-brand distribution — dual-brand hub projects only. */
  async getDistribution(
    _context: PlatformContext,
    ref: ContentRef
  ): Promise<ContentDistributionSnapshot | null> {
    const valid = this.assertMirotechRef(ref);
    if (valid.type !== "dual-brand-work") {
      throw new ContentUnsupportedTypeError(
        `Distribution is only supported for dual-brand-work, not ${valid.type}.`
      );
    }
    const hub = await this.readPort.getHubProjectById(valid.id);
    if (!hub) return null;
    return mapHubProjectToDistribution(valid, hub);
  }

  /** Platform status DTO — read-only lifecycle and publish flags. */
  async getStatus(_context: PlatformContext, ref: ContentRef): Promise<MirotechCaseStudyStatus | null> {
    const valid = this.assertMirotechRef(ref);
    if (valid.type === "mirotech-case-study") {
      const project = await this.readPort.getMirotechWorkBySlug(valid.id);
      if (!project) return null;
      return mapWorkProjectToStatus(project);
    }

    const hub = await this.readPort.getHubProjectById(valid.id);
    if (!hub) return null;
    return mapHubProjectToStatus(hub);
  }

  /**
   * Resolve reference summary — alias aligned with Phase 5B spec naming.
   * Throws ContentNotFoundError when explicitly requested via `{ strict: true }`.
   */
  async getByRef(
    ref: ContentRef,
    options?: { strict?: boolean }
  ): Promise<ContentReferenceSummary | null> {
    const valid = this.assertMirotechRef(ref);

    if (valid.type === "mirotech-case-study") {
      const project = await this.readPort.getMirotechWorkBySlug(valid.id);
      if (!project) {
        if (options?.strict) throw new ContentNotFoundError();
        return null;
      }
      return mapWorkProjectToReferenceSummary(valid, project);
    }

    const hub = await this.readPort.getHubProjectById(valid.id);
    if (!hub) {
      if (options?.strict) throw new ContentNotFoundError();
      return null;
    }
    return mapHubProjectToReferenceSummary(valid, hub);
  }

  async listPublished(
    _context: PlatformContext,
    type: ContentType,
    options?: { limit?: number; cursor?: string }
  ): Promise<ContentListResult> {
    const limit = Math.min(Math.max(options?.limit ?? 30, 1), 50);
    const cursor = options?.cursor;

    if (type === "dual-brand-work") {
      const hubs = await this.readPort.listHubProjects();
      const sorted = [...hubs].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
      const start = cursor ? sorted.findIndex((h) => h.id === cursor) + 1 : 0;
      const slice = sorted.slice(start, start + limit);
      return {
        items: slice.map((hub) =>
          mapHubProjectToReferenceSummary(
            { tenant: MIROTECH_TENANT, type: "dual-brand-work", id: hub.id },
            hub
          )
        ),
        nextCursor: slice.length === limit ? slice[slice.length - 1]?.id : undefined,
      };
    }

    if (type === "mirotech-case-study") {
      const projects = await this.readPort.listMirotechCaseStudies();
      const sorted = [...projects].sort((a, b) => b.sortOrder - a.sortOrder);
      const start = cursor ? sorted.findIndex((p) => p.slug === cursor) + 1 : 0;
      const slice = sorted.slice(start, start + limit);
      return {
        items: slice.map((project) =>
          mapWorkProjectToReferenceSummary(
            { tenant: MIROTECH_TENANT, type: "mirotech-case-study", id: project.slug },
            project
          )
        ),
        nextCursor: slice.length === limit ? slice[slice.length - 1]?.slug : undefined,
      };
    }

    throw new ContentUnsupportedTypeError(
      `Mirotech content adapter does not support content type "${type}".`
    );
  }

  private assertMirotechRef(ref: ContentRef): ContentRef & { type: MirotechAdapterContentType } {
    const valid = assertValidContentRef(ref);
    if (valid.tenant !== MIROTECH_TENANT) {
      throw new ContentTenantMismatchError(
        `Mirotech content adapter requires tenant "mirotech", received "${valid.tenant}".`
      );
    }
    if (!isMirotechAdapterContentType(valid.type)) {
      throw new ContentUnsupportedTypeError(
        `Mirotech content adapter does not support content type "${valid.type}".`
      );
    }
    return { ...valid, type: valid.type };
  }
}

export const mirotechContentAdapter = new MirotechContentAdapter();
