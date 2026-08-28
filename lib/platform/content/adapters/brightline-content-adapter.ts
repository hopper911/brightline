/**
 * Brightline tenant content adapter (Phase 5C).
 * Read-only public marketing metadata — no client galleries, delivery, or contact data.
 */

import type { PlatformContext } from "@/lib/platform/context/types";
import type { ContentProvider } from "@/lib/platform/content/content-provider";
import type { BrightlinePublicContentStatus } from "@/lib/platform/content/dto/brightline-public-content";
import {
  ContentNotFoundError,
  ContentTenantMismatchError,
  ContentUnsupportedTypeError,
} from "@/lib/platform/content/errors";
import type { BrightlineContentReadPort } from "@/lib/platform/content/integrations/brightline-content-read-port";
import { defaultBrightlineContentReadPort } from "@/lib/platform/content/integrations/default-brightline-content-read";
import {
  isBrightlineAdapterContentType,
  mapPortfolioProjectToPublishedSnapshot,
  mapPortfolioProjectToReferenceSummary,
  mapPortfolioProjectToStatus,
  mapWorkProjectToPublishedSnapshot,
  mapWorkProjectToReferenceSummary,
  mapWorkProjectToStatus,
  type BrightlineAdapterContentType,
} from "@/lib/platform/content/integrations/map-brightline-content";
import type {
  ContentPublishedSnapshot,
  ContentRef,
  ContentReferenceSummary,
} from "@/lib/platform/content/types";
import { assertValidContentRef } from "@/lib/platform/content/types";
import type { TenantSlug } from "@/lib/platform/tenants/types";

const BRIGHTLINE_TENANT: TenantSlug = "brightline";

export class BrightlineContentAdapter implements ContentProvider {
  readonly tenant = BRIGHTLINE_TENANT;

  constructor(
    private readonly readPort: BrightlineContentReadPort = defaultBrightlineContentReadPort
  ) {}

  supports(ref: ContentRef): boolean {
    try {
      const valid = assertValidContentRef(ref);
      return valid.tenant === BRIGHTLINE_TENANT && isBrightlineAdapterContentType(valid.type);
    } catch {
      return false;
    }
  }

  async resolveReference(
    _context: PlatformContext,
    ref: ContentRef
  ): Promise<ContentReferenceSummary | null> {
    const valid = this.assertBrightlineRef(ref);
    return this.getByRef(valid);
  }

  async getPublished(
    _context: PlatformContext,
    ref: ContentRef
  ): Promise<ContentPublishedSnapshot | null> {
    const valid = this.assertBrightlineRef(ref);

    if (valid.type === "work-project") {
      const row = await this.readPort.getWorkProjectById(valid.id);
      if (!row) return null;
      return mapWorkProjectToPublishedSnapshot(valid, row);
    }

    const row = await this.readPort.getPortfolioProjectById(valid.id);
    if (!row) return null;
    return mapPortfolioProjectToPublishedSnapshot(valid, row);
  }

  async getStatus(
    _context: PlatformContext,
    ref: ContentRef
  ): Promise<BrightlinePublicContentStatus | null> {
    const valid = this.assertBrightlineRef(ref);

    if (valid.type === "work-project") {
      const row = await this.readPort.getWorkProjectById(valid.id);
      if (!row) return null;
      return mapWorkProjectToStatus(row);
    }

    const row = await this.readPort.getPortfolioProjectById(valid.id);
    if (!row) return null;
    return mapPortfolioProjectToStatus(row);
  }

  async getByRef(
    ref: ContentRef,
    options?: { strict?: boolean }
  ): Promise<ContentReferenceSummary | null> {
    const valid = this.assertBrightlineRef(ref);

    if (valid.type === "work-project") {
      const row = await this.readPort.getWorkProjectById(valid.id);
      if (!row) {
        if (options?.strict) throw new ContentNotFoundError();
        return null;
      }
      return mapWorkProjectToReferenceSummary(valid, row);
    }

    const row = await this.readPort.getPortfolioProjectById(valid.id);
    if (!row) {
      if (options?.strict) throw new ContentNotFoundError();
      return null;
    }
    return mapPortfolioProjectToReferenceSummary(valid, row);
  }

  private assertBrightlineRef(ref: ContentRef): ContentRef & { type: BrightlineAdapterContentType } {
    const valid = assertValidContentRef(ref);
    if (valid.tenant !== BRIGHTLINE_TENANT) {
      throw new ContentTenantMismatchError(
        `Brightline content adapter requires tenant "brightline", received "${valid.tenant}".`
      );
    }
    if (!isBrightlineAdapterContentType(valid.type)) {
      throw new ContentUnsupportedTypeError(
        `Brightline content adapter does not support content type "${valid.type}".`
      );
    }
    return { ...valid, type: valid.type };
  }
}

export const brightlineContentAdapter = new BrightlineContentAdapter();
