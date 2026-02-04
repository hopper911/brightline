import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const title = searchParams.get("title") || "Bright Line Photography";
  const subtitle = searchParams.get("subtitle") || "Commercial Photography";
  const category = searchParams.get("category") || "";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          backgroundColor: "#0a0a0a",
          padding: "60px 80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Background gradient */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 50%, #000 100%)",
          }}
        />
        
        {/* Subtle grid pattern */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.03,
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        
        {/* Category badge */}
        {category && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "rgba(255,255,255,0.5)",
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                padding: "8px 16px",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "100px",
              }}
            >
              {category}
            </span>
          </div>
        )}

        {/* Title */}
        <h1
          style={{
            fontSize: title.length > 30 ? "56px" : "72px",
            fontWeight: 600,
            color: "#ffffff",
            lineHeight: 1.1,
            margin: 0,
            marginBottom: "16px",
            maxWidth: "900px",
          }}
        >
          {title}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "24px",
            color: "rgba(255,255,255,0.6)",
            margin: 0,
            marginBottom: "40px",
            maxWidth: "700px",
          }}
        >
          {subtitle}
        </p>

        {/* Brand footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <span
            style={{
              fontSize: "16px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            Bright Line Photography
          </span>
          <span
            style={{
              width: "4px",
              height: "4px",
              borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.3)",
            }}
          />
          <span
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.3)",
              letterSpacing: "0.1em",
            }}
          >
            brightlinephotography.co
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
