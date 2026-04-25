/**
 * Machine-to-machine auth for Studio OS routes (`/api/projects/*`, related automation).
 *
 * Configure one or both:
 * - `AUTOMATION_API_SECRET` — legacy name, still supported
 * - `BL_INTERNAL_API_TOKEN` — same usage; set if you prefer a dedicated name in docs
 *
 * Send: `Authorization: Bearer <token>`
 *
 * Admins logged into `/admin` are also allowed (cookie session) via `requireProjectsApiAuth`.
 */
export { requireProjectsApiAuth } from "@/lib/api/automation-auth";
