import { ImageResponse } from "next/og";

export const runtime = "edge";

/** Default OG image when no route-specific asset exists. */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#0a0a0a",
          color: "#fafafa",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          width: "100%",
          fontSize: 56,
          fontWeight: 500,
          letterSpacing: "-0.02em",
        }}
      >
        Bright Line Photography
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
