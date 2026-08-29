import createDOMPurify from "dompurify";

const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true } as const,
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
};

let purify: ReturnType<typeof createDOMPurify> | null = null;

function getDOMPurify(): ReturnType<typeof createDOMPurify> {
  if (purify) return purify;
  if (typeof window === "undefined") {
    throw new Error("sanitizeHtmlForClientPreview requires a browser environment");
  }
  purify = createDOMPurify(window);
  return purify;
}

/**
 * Sanitize operator-authored HTML for client-facing contract/document preview.
 * Browser-only — import from client components, not server/API routes.
 */
export function sanitizeHtmlForClientPreview(html: string): string {
  const cleaned = getDOMPurify().sanitize(html, SANITIZE_CONFIG);
  // Block SVG data URIs (XSS vector) while allowing raster data:image/* if present.
  return cleaned.replace(/data:image\/svg\+xml[^"'\s>]*/gi, "about:blank");
}
