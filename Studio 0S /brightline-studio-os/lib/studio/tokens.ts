/**
 * Bright Line Studio OS – Design Tokens
 *
 * Luxury editorial photography command center aesthetic:
 * Dark, architectural, premium, minimal, quiet luxury.
 * Charcoal/graphite base, muted violet accent, soft warm gray text.
 */

export const tokens = {
  // Backgrounds – charcoal / graphite
  bg: {
    base: "#050608",
    surface: "#0c0e12",
    elevated: "#12151a",
    panel: "#0e1116",
    overlay: "rgba(5, 6, 8, 0.85)",
  },

  // Panel / card surfaces
  panel: {
    bg: "rgba(255, 255, 255, 0.02)",
    bgHover: "rgba(255, 255, 255, 0.035)",
    border: "rgba(255, 255, 255, 0.05)",
    borderHover: "rgba(139, 124, 160, 0.15)",
  },

  // Borders
  border: {
    subtle: "rgba(255, 255, 255, 0.05)",
    default: "rgba(255, 255, 255, 0.08)",
    muted: "rgba(255, 255, 255, 0.04)",
  },

  // Text – soft warm gray
  text: {
    primary: "rgba(255, 255, 255, 0.95)",
    secondary: "rgba(255, 255, 255, 0.65)",
    muted: "rgba(255, 255, 255, 0.45)",
    dim: "rgba(255, 255, 255, 0.35)",
    inverse: "#0a0c10",
  },

  // Accent – muted violet
  accent: {
    default: "rgba(139, 124, 180, 0.9)",
    muted: "rgba(139, 124, 180, 0.5)",
    glow: "rgba(139, 124, 180, 0.12)",
    border: "rgba(139, 124, 180, 0.2)",
  },

  // Restrained highlights
  highlight: {
    success: "rgba(163, 188, 171, 0.9)",
    warning: "rgba(191, 177, 145, 0.9)",
    error: "rgba(200, 150, 155, 0.9)",
    info: "rgba(150, 175, 200, 0.9)",
  },

  // Typography scale
  font: {
    display: "var(--font-montserrat)",
    body: "var(--font-inter)",
    mono: "var(--font-mono)",
  },
  size: {
    xs: "0.625rem",   // 10px
    sm: "0.75rem",    // 12px
    base: "0.875rem", // 14px
    md: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
  },
  weight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  tracking: {
    tight: "-0.02em",
    normal: "0",
    wide: "0.05em",
    wider: "0.1em",
    widest: "0.2em",
  },

  // Spacing
  space: {
    xs: "0.25rem",  // 4
    sm: "0.5rem",   // 8
    md: "0.75rem",  // 12
    base: "1rem",   // 16
    lg: "1.25rem",  // 20
    xl: "1.5rem",   // 24
    "2xl": "2rem",
    "3xl": "2.5rem",
    "4xl": "3rem",
  },

  // Corner radius
  radius: {
    sm: "0.5rem",   // 8px
    base: "0.75rem", // 12px
    md: "1rem",     // 16px
    lg: "1.25rem",  // 20px
    xl: "1.5rem",   // 24px
    "2xl": "1.75rem", // 28px
  },

  // Shadows / glow – restrained
  shadow: {
    panel: "0 0 20px rgba(0, 0, 0, 0.4)",
    elevated: "0 0 32px rgba(0, 0, 0, 0.35)",
    glow: "0 0 24px rgba(139, 124, 180, 0.08)",
    glowStrong: "0 0 32px rgba(139, 124, 180, 0.12)",
  },

  // Transitions
  transition: {
    fast: "120ms ease",
    base: "180ms ease",
    slow: "240ms ease",
  },
} as const;
