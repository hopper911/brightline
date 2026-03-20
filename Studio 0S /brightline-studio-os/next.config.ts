import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  async redirects() {
    return [
      { source: "/studio", destination: "/studio/dashboard", permanent: true },
      { source: "/studio/jobs", destination: "/studio/projects/jobs", permanent: true },
      { source: "/studio/marketing", destination: "/studio/publishing", permanent: true },
      { source: "/studio/onboarding", destination: "/onboarding", permanent: true },
      { source: "/studio/reception", destination: "/studio/crm", permanent: true },
      { source: "/studio/lounge", destination: "/studio/crm/lounge", permanent: true },
      { source: "/studio/editing", destination: "/studio/production/editing", permanent: true },
      { source: "/studio/delivery", destination: "/studio/production/delivery", permanent: true },
      { source: "/studio/approvals", destination: "/studio/production/approvals", permanent: true },
      { source: "/studio/archive", destination: "/studio/projects/archive", permanent: true },
      { source: "/studio/events", destination: "/studio/dashboard/events", permanent: true },
      { source: "/studio/sessions", destination: "/studio/dashboard/sessions", permanent: true },
      { source: "/studio/strategy", destination: "/studio/dashboard/strategy", permanent: true },
      { source: "/studio/automation", destination: "/studio/settings/automation", permanent: true },
    ];
  },
};

export default nextConfig;
