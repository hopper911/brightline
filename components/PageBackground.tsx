import { getPublicR2Url } from "@/lib/r2";

function mediaUrl(input?: string | null) {
  const value = input?.trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value) || value.startsWith("/")) return value;
  return getPublicR2Url(value);
}

function isVideoUrl(url: string) {
  const decoded = decodeURIComponent(url);
  try {
    const parsed = new URL(decoded, "https://brightline.local");
    const key = parsed.searchParams.get("key") ?? "";
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(key || parsed.pathname);
  } catch {
    return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(decoded);
  }
}

export default function PageBackground({
  media,
  poster,
  className = "",
}: {
  media?: string | null;
  poster?: string | null;
  className?: string;
}) {
  const src = mediaUrl(media);
  if (!src) return null;

  return (
    <div className={`pointer-events-none fixed inset-0 z-[1] overflow-hidden ${className}`} aria-hidden>
      {isVideoUrl(src) ? (
        <video
          src={src}
          poster={mediaUrl(poster) || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover opacity-45"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover opacity-45" />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.12),transparent_28%),linear-gradient(180deg,rgba(7,9,11,0.52),rgba(7,9,11,0.9))]" />
    </div>
  );
}
