import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
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

export default nextConfig;
