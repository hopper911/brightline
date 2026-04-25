import { NextResponse } from "next/server";

/** Served as a route so production always returns 200 even if `public/` static copy is missing. */
const MANIFEST = {
  name: "BRIGHTLINE Photography",
  short_name: "BRIGHTLINE",
  icons: [
    {
      src: "/brand/brightline-bl-monogram.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
    {
      src: "/brand/brightline-bl-monogram.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
  ],
  theme_color: "#1a1d21",
  background_color: "#1a1d21",
  display: "browser" as const,
};

export async function GET() {
  return NextResponse.json(MANIFEST, {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
