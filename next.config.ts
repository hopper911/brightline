import path from "path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { mergeParentDotenvIntoProcess } from "./lib/merge-parent-dotenv";

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
  ...(process.env.NODE_ENV === "development" ? ["http://127.0.0.1:7242"] : []),
  "https://plausible.io",
  "https://api.resend.com",
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
    ],
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "media-src 'self' data: https: blob:",
              `connect-src ${connectSrcParts.join(" ")}`,
              "manifest-src 'self'",
              "frame-src 'self' https://www.youtube-nocookie.com",
              "frame-ancestors 'self'",
            ].join("; "),
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
