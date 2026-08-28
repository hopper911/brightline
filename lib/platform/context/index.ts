export type { PlatformContext } from "@/lib/platform/context/types";
export {
  createPlatformContext,
  createPlatformContextForTenant,
} from "@/lib/platform/context/types";

export {
  getRequestTenant,
  resolveTenantFromRequest,
} from "@/lib/platform/context/request-tenant";
