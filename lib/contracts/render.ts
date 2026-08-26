import DOMPurify from "isomorphic-dompurify";

/**
 * Escape text for safe inclusion in HTML (attribute or text nodes when building strings).
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Replace `{{key}}` in HTML. Values are HTML-escaped to reduce injection from CRM fields.
 */
export function replaceTemplateVariables(html: string, variables: Record<string, string>): string {
  return html.replace(/\{\{([\w.]+)\}\}/g, (_, key: string) => {
    const val = variables[key];
    if (val === undefined) return `{{${key}}}`;
    return escapeHtml(val);
  });
}

/**
 * Sanitize operator-authored HTML for client-facing contract/document preview.
 */
export function sanitizeHtmlForClientPreview(html: string): string {
  const cleaned = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
  });
  // Block SVG data URIs (XSS vector) while allowing raster data:image/* if present.
  return cleaned.replace(/data:image\/svg\+xml[^"'\s>]*/gi, "about:blank");
}

/** Very small HTML → plain text for PDF body (blocks + breaks). */
export function htmlToPlainText(html: string): string {
  let t = html;
  t = t.replace(/<br\s*\/?>/gi, "\n");
  t = t.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n");
  t = t.replace(/<[^>]+>/g, "");
  t = t.replace(/&nbsp;/g, " ");
  t = t.replace(/&amp;/g, "&");
  t = t.replace(/&lt;/g, "<");
  t = t.replace(/&gt;/g, ">");
  t = t.replace(/&quot;/g, '"');
  t = t.replace(/&#39;/g, "'");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}
