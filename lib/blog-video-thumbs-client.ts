/** Client-safe YouTube thumbnail helpers (no Node builtins). */

export function youtubeThumbnailUrl(videoId: string, quality: "hq" | "mq" | "max" = "hq"): string {
  const id = videoId.trim();
  if (quality === "max") return `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  if (quality === "mq") return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeThumbnailCandidates(videoId: string): string[] {
  return [
    youtubeThumbnailUrl(videoId, "max"),
    youtubeThumbnailUrl(videoId, "hq"),
    youtubeThumbnailUrl(videoId, "mq"),
  ];
}
