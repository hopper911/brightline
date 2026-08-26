import path from "path";
import { createRequire } from "module";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { mergeParentDotenvIntoProcess } from "./lib/merge-parent-dotenv";

const require = createRequire(import.meta.url);

// Repo-root `.env.local` (parent of this app): `next dev` cwd is `brightline/brightline`, so default
// Next env loading misses variables only defined one level up. Vercel injects env — skip there.
if (process.env.VERCEL !== "1") {
  loadEnvConfig(path.join(__dirname, ".."));
  mergeParentDotenvIntoProcess();
}

const r2PublicBase =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ||
  process.env.R2_PUBLIC_URL ||
  "";

/**
 * Local Desktop layout nests this app under `brightline/brightline`; tracing to `..` avoids webpack
 * resolving an unrelated root `package.json`. On Vercel the deploy root is this app only — use
 * `__dirname` or the builder looks for `.next` under a doubled path and fails (routes-manifest).
 */
// Keep tracing root scoped to the app directory to avoid filesystem timeouts
// during build trace collection on large local workspaces.
const tracingRoot = __dirname;

const connectSrcParts = [
  "'self'",
  "https://plausible.io",
  "https://api.resend.com",
  // Direct browser PUTs to signed R2 upload URLs (admin media / backgrounds)
  "https://*.r2.cloudflarestorage.com",
  "https://*.r2.dev",
  // ffmpeg.wasm core (admin background web encode)
  "https://cdn.jsdelivr.net",
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: tracingRoot,
  turbopack: {
    root: tracingRoot,
  },
  webpack: (config) => {
    // Some local environments (and certain sandboxed runners) have shown intermittent `ETIMEDOUT`
    // during webpack's persistent cache reads. Disable persistent caching for reliability.
    config.cache = false;
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /@opentelemetry[\\/].*instrumentation/ },
    ];
    // Align `@opentelemetry/api` with Next's compiled tracer fallback. A broken or mismatched
    // hoisted copy can make `require('@opentelemetry/api')` "succeed" but omit
    // `createContextKey` → `TypeError: api.createContextKey is not a function` during build/runtime.
    const nextRoot = path.dirname(require.resolve("next/package.json"));
    config.resolve.alias = {
      ...config.resolve.alias,
      "@opentelemetry/api": path.join(nextRoot, "dist/compiled/@opentelemetry/api"),
    };
    return config;
  },
  env: {
    NEXT_PUBLIC_R2_PUBLIC_URL: r2PublicBase,
  },
  // TODO: set to false after `npx tsc --noEmit` passes (Prisma/media fields, motion+HomeHero,
  // SEO pillar pages, homepage featured displayKey, empty route modules, client gallery params).
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Uploaded portfolio/media assets are already converted to right-sized WebP
    // files and are served through `/api/media/public`, which redirects to a
    // short-lived signed R2 URL. Next's optimizer rejects that proxy route in
    // production, so render the browser-facing URL directly.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.brightlinephotography.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.myportfolio.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/client_access", destination: "/client", permanent: true },
      { source: "/client-access", destination: "/client", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/favicon.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/apple-icon.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/site.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "form-action 'self'",
              // Next.js requires unsafe-eval/inline today; prefer nonces in a future CSP pass.
              "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' 'unsafe-inline' https://plausible.io blob:",
              // ffmpeg.wasm: module worker + blob workers (Video Port / background encode)
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
              // Public marketing images may be absolute https (R2 / media proxy / YT thumbs).
              "img-src 'self' data: blob: https:",
              "media-src 'self' data: blob: https://*.r2.cloudflarestorage.com https://*.r2.dev https://brightlinephotography.com https://*.brightlinephotography.com https://www.youtube-nocookie.com",
              `connect-src ${connectSrcParts.join(" ")}`,
              "manifest-src 'self'",
              "frame-src 'self' https://www.youtube-nocookie.com https://www.instagram.com https://instagram.com https://calendly.com https://*.calendly.com https://www.google.com https://maps.google.com https://maps.googleapis.com",
              "frame-ancestors 'self'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
    ];
  },
};

export default nextConfig;
