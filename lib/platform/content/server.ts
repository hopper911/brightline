/**
 * Server-only content adapters — import from route handlers when PLATFORM_CONTENT_ENABLED cutover begins.
 */

export {
  MirotechContentAdapter,
  mirotechContentAdapter,
} from "@/lib/platform/content/adapters/mirotech-content-adapter";
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
  MirotechCaseStudySnapshot,
  MirotechCaseStudyStatus,
} from "@/lib/platform/content/dto/mirotech-case-study";
