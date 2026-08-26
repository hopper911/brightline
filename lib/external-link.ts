/**
 * Only open a new browser tab for true external http(s) URLs.
 * Same-origin and relative paths must navigate in the current tab.
 */
export function isExternalHttpUrl(href: string | null | undefined): boolean {
  const raw = (href ?? "").trim();
  if (!raw) return false;
  if (raw.startsWith("/") || raw.startsWith("#") || raw.startsWith("?")) return false;
  if (raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("sms:")) return false;
  try {
    const url = new URL(raw, "https://brightlinephotography.com");
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "brightlinephotography.com" || host === "localhost" || host === "127.0.0.1") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Props for <a> / Link — empty object for in-app navigation. */
export function externalLinkProps(href: string | null | undefined): {
  target?: "_blank";
  rel?: "noopener noreferrer";
} {
  if (!isExternalHttpUrl(href)) return {};
  return { target: "_blank", rel: "noopener noreferrer" };
}
