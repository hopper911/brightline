/**
 * Share / export presets for site background clips (admin).
 * Playback on the site uses the web encode when present; masters stay in full/.
 */

export type BackgroundSharePlatform = {
  id: string;
  label: string;
  /** Recommended frame size for export encodes. */
  width: number;
  height: number;
  aspect: string;
  notes: string;
  /** Opens an external upload / share surface when possible. */
  actionLabel: string;
};

export const BACKGROUND_SHARE_PLATFORMS: BackgroundSharePlatform[] = [
  {
    id: "youtube",
    label: "YouTube",
    width: 1920,
    height: 1080,
    aspect: "16:9",
    notes: "1080p H.264, ≤10–15 Mbps for long cinematic clips. Upload via YouTube Studio.",
    actionLabel: "Open YouTube Studio",
  },
  {
    id: "instagram",
    label: "Instagram Reels / Feed",
    width: 1080,
    height: 1920,
    aspect: "9:16",
    notes: "Vertical 9:16, under ~90 seconds for Reels. Export a vertical crop when possible.",
    actionLabel: "Copy video link",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    width: 1920,
    height: 1080,
    aspect: "16:9",
    notes: "Landscape 1080p works best for company page posts.",
    actionLabel: "Share on LinkedIn",
  },
  {
    id: "x",
    label: "X (Twitter)",
    width: 1920,
    height: 1080,
    aspect: "16:9",
    notes: "Keep under ~2:20 for reliable autoplay; attach the web encode file when posting.",
    actionLabel: "Share on X",
  },
];

/** Absolute URL for a public media key (site playback / share). */
export function backgroundPublicPageUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/`;
}

export function youtubeStudioUploadUrl(): string {
  return "https://studio.youtube.com/";
}

export function linkedInShareUrl(url: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

export function xShareUrl(url: string, text: string): string {
  return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

/** Target long-edge for site background web encodes (cinematic but light enough for autoplay). */
export const SITE_BG_WEB_LONG_EDGE = 1920;
