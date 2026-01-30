import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Disable Turbopack for builds due to ESM compatibility issues with framer-motion
  // Turbopack is still used in development (next dev --turbopack)
  productionBrowserSourceMaps: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/work/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/og-image.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/work/real-estate",
        destination: "/portfolio/commercial-real-estate/real-estate-01",
        permanent: true,
      },
      {
        source: "/work/hotel",
        destination: "/portfolio/hospitality/hotel-01",
        permanent: true,
      },
      {
        source: "/work/fashion",
        destination: "/portfolio/fashion/fashion-01",
        permanent: true,
      },
      {
        source: "/work",
        destination: "/portfolio",
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
});
