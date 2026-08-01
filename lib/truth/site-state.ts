/**
 * Snapshot of the live BRIGHTLINE photography website — permanent reference.
 * Frozen: 2026-08-01. Do not rewrite this narrative to justify redesigns.
 */

export const TRUTH_FROZEN_AT = "2026-08-01" as const;

/**
 * Current production state notes (observational). Not a backlog.
 * Product changes require an explicit user request; do not “improve” from this.
 */
export const SITE_STATE = Object.freeze({
  frozenAt: TRUTH_FROZEN_AT,
  productionOrigin: "https://brightlinephotography.com",
  stack: Object.freeze({
    framework: "Next.js App Router",
    runtime: "Node 20 / Vercel",
    data: "Prisma + Neon Postgres",
    media: "Cloudflare R2",
    edgeGate: "proxy.ts (admin / studio / accountant CSRF + admin session)",
  }),
  publicSurfaces: Object.freeze([
    "Marketing home and pillar Work case studies",
    "Galleries (client + public listing surfaces)",
    "Services, About, Contact",
    "Journal / blog with in-frame Instagram + YouTube embeds",
    "Optional Design section (CMS-gated nav)",
    "Token delivery packages (/package/*, /final-package/*)",
  ]),
  privateSurfaces: Object.freeze([
    "/admin — Mission Control (cookie session)",
    "/studio — Studio OS CMS",
    "/accountant — finance portal (JWT or owner admin)",
    "/client — client gallery access (HMAC session)",
  ]),
  brandChrome: Object.freeze({
    topNavBrand: "Text BRIGHTLINE + smaller PHOTOGRAPHY (no wordmark in top nav)",
    coreNavLabels: Object.freeze(["Work", "Galleries", "Services", "About", "Contact"]),
    look: "Dark charcoal/black photographic base, crisp white type, fine-line accents",
    logos: Object.freeze({
      wordmark: "/brand/brightline-photography-wordmark.png",
      monogram: "/brand/brightline-bl-monogram.png",
    }),
  }),
  securityBaseline: Object.freeze({
    edgeCsrf: "rejectCrossSiteMutation on /api/admin, /api/studio, /api/accountant (login exempt)",
    ssrf: "assertPublicHttpUrlResolved + fetchTrustedImageBytes / trustedImageToDataUrl for outbound image fetches",
    uploads: "MIME allowlist; never image/svg+xml or HTML",
    tokens: "Package + final-package rate limits; finalPackageExpiresAt on new tokens",
    sheet: "Never overwrite Google Sheet formula cells (Brightline Image Uploads)",
  }),
  deferredNotBaseline: Object.freeze([
    "Full CSP nonce migration (unsafe-inline / unsafe-eval still required by Next today)",
  ]),
} as const);
