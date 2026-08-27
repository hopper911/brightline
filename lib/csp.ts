/**
 * Build a per-request Content-Security-Policy with a script nonce.
 * style-src keeps 'unsafe-inline' — Next/Tailwind/framer still emit inline styles.
 * script-src uses nonce + strict-dynamic (unsafe-inline is ignored by modern browsers when a nonce is present; kept as legacy fallback).
 */

export function createCspNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

export type CspBrand = "brightline" | "mirotech";

export function buildContentSecurityPolicy(
  nonce: string,
  brand: CspBrand,
  options?: { isDev?: boolean }
): string {
  const isDev = options?.isDev ?? process.env.NODE_ENV !== "production";
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    // Legacy browsers without nonce support; ignored when nonce is present in modern browsers.
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    ...(brand === "brightline" ? ["'wasm-unsafe-eval'", "blob:"] : []),
  ].join(" ");

  const connectSrc =
    brand === "brightline"
      ? [
          "'self'",
          "https://plausible.io",
          "https://api.resend.com",
          "https://*.r2.cloudflarestorage.com",
          "https://*.r2.dev",
          "https://cdn.jsdelivr.net",
          "https://www.google-analytics.com",
          "https://www.googletagmanager.com",
        ].join(" ")
      : [
          "'self'",
          "https://plausible.io",
          "https://api.resend.com",
          "https://challenges.cloudflare.com",
          "https://*.r2.cloudflarestorage.com",
          "https://*.*.r2.cloudflarestorage.com",
          "https://*.r2.dev",
          "https://media.mirotech.solutions",
          "https://brightlinephotography.com",
          "https://*.brightlinephotography.com",
          "https://*.basemaps.cartocdn.com",
          "https://*.tile.openstreetmap.org",
          "https://www.google-analytics.com",
          "https://www.googletagmanager.com",
        ].join(" ");

  const mediaSrc =
    brand === "brightline"
      ? "media-src 'self' data: blob: https://*.r2.cloudflarestorage.com https://*.r2.dev https://brightlinephotography.com https://*.brightlinephotography.com https://www.youtube-nocookie.com"
      : "media-src 'self' data: blob: https://*.r2.cloudflarestorage.com https://*.*.r2.cloudflarestorage.com https://*.r2.dev https://media.mirotech.solutions https://brightlinephotography.com https://*.brightlinephotography.com https://www.youtube-nocookie.com";

  const frameSrc =
    brand === "brightline"
      ? "frame-src 'self' https://www.youtube-nocookie.com https://www.instagram.com https://instagram.com https://calendly.com https://*.calendly.com https://www.google.com https://maps.google.com https://maps.googleapis.com"
      : "frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com https://www.youtube.com https://www.instagram.com https://instagram.com https://www.google.com https://maps.google.com https://maps.googleapis.com";

  const frameAncestors = brand === "brightline" ? "frame-ancestors 'self'" : "frame-ancestors 'none'";

  const workerSrc =
    brand === "brightline"
      ? "worker-src 'self' blob:; child-src 'self' blob:"
      : "worker-src 'self' blob:";

  const fontSrc =
    brand === "brightline"
      ? "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com"
      : "font-src 'self' data:";

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    `script-src ${scriptSrc}`,
    workerSrc,
    "style-src 'self' 'unsafe-inline'",
    fontSrc,
    "img-src 'self' data: blob: https:",
    mediaSrc,
    `connect-src ${connectSrc}`,
    brand === "brightline" ? "manifest-src 'self'" : null,
    frameSrc,
    frameAncestors,
    "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .join("; ");
}
