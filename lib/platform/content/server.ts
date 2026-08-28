/**
 * Server-only content adapters — import from route handlers when PLATFORM_CONTENT_ENABLED cutover begins.
 */

export {
  BrightlineContentAdapter,
  brightlineContentAdapter,
} from "@/lib/platform/content/adapters/brightline-content-adapter";
export {
  MirotechContentAdapter,
  mirotechContentAdapter,
} from "@/lib/platform/content/adapters/mirotech-content-adapter";
export {
  DefaultContentProviderRegistry,
  defaultContentProviderRegistry,
} from "@/lib/platform/content/content-provider-registry";
export {
  DefaultContentService,
  defaultContentService,
} from "@/lib/platform/content/default-content-service";
export {
  legacyResolveAdminWorkPreviewContext,
  platformResolveAdminWorkPreviewContext,
  resolveAdminWorkPreviewContext,
  type AdminWorkPreviewContext,
} from "@/lib/platform/content/integrations/admin-work-preview-context";
export { defaultBrightlineContentReadPort } from "@/lib/platform/content/integrations/default-brightline-content-read";
export type { BrightlineContentReadPort } from "@/lib/platform/content/integrations/brightline-content-read-port";
export { defaultMirotechContentReadPort } from "@/lib/platform/content/integrations/default-mirotech-content-read";
export type { MirotechContentReadPort } from "@/lib/platform/content/integrations/mirotech-content-read-port";
export {
  ContentConfigurationError,
  ContentError,
  ContentInvalidRefError,
  ContentNotFoundError,
  ContentTenantMismatchError,
  ContentUnsupportedTypeError,
  isContentError,
  type ContentErrorCode,
} from "@/lib/platform/content/errors";
export type {
  BrightlinePortfolioProjectSnapshot,
  BrightlinePublicContentStatus,
  BrightlineWorkProjectSnapshot,
} from "@/lib/platform/content/dto/brightline-public-content";
export type {
  MirotechCaseStudySnapshot,
  MirotechCaseStudyStatus,
} from "@/lib/platform/content/dto/mirotech-case-study";
