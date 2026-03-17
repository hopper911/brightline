import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: "#050608",
          surface: "#0c0e12",
          elevated: "#12151a",
        },
        accent: {
          DEFAULT: "rgba(139, 124, 180, 0.9)",
          muted: "rgba(139, 124, 180, 0.5)",
          glow: "rgba(139, 124, 180, 0.12)",
          border: "rgba(139, 124, 180, 0.2)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-montserrat)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "studio-sm": "0.5rem",
        "studio-base": "0.75rem",
        "studio-md": "1rem",
        "studio-lg": "1.25rem",
        "studio-xl": "1.5rem",
        "studio-2xl": "1.75rem",
      },
      boxShadow: {
        studio: "0 0 20px rgba(0, 0, 0, 0.4)",
        "studio-elevated": "0 0 32px rgba(0, 0, 0, 0.35)",
        "studio-glow": "0 0 24px rgba(139, 124, 180, 0.08)",
        "studio-glow-strong": "0 0 32px rgba(139, 124, 180, 0.12)",
      },
      transitionDuration: {
        "120": "120ms",
        "180": "180ms",
        "240": "240ms",
      },
    },
  },
  plugins: [],
};

export default config;
