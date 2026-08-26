/** Safe embedding of JSON-LD into a <script> tag (prevents </script> breakout). */
export function safeJsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
