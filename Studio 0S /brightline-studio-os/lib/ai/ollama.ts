/**
 * Bright Line Studio OS – Ollama service
 *
 * Local-only. Connects to Ollama at http://localhost:11434.
 * Graceful fallback when unavailable.
 */

const OLLAMA_BASE = "http://localhost:11434";
export const OLLAMA_DEFAULT_MODEL = "llama3";
const DEFAULT_MODEL = OLLAMA_DEFAULT_MODEL;
const TIMEOUT_MS = 30000;

let cachedAvailable: boolean | null = null;

export async function isOllamaAvailable(): Promise<boolean> {
  if (cachedAvailable !== null) return cachedAvailable;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: ctrl.signal });
    clearTimeout(t);
    cachedAvailable = res.ok;
    return res.ok;
  } catch {
    cachedAvailable = false;
    return false;
  }
}

export function clearOllamaCache(): void {
  cachedAvailable = null;
}

export type GenerateResult = { text: string; model: string } | { error: string };

export async function generateText(
  prompt: string,
  model?: string
): Promise<GenerateResult> {
  const m = model ?? DEFAULT_MODEL;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: m, prompt, stream: false }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      const body = await res.text();
      return { error: body || `Ollama returned ${res.status}` };
    }
    const data = (await res.json()) as { response?: string };
    const text = typeof data.response === "string" ? data.response.trim() : "";
    return { text: text || "(empty response)", model: m };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ollama request failed" };
  }
}

export async function generateStructuredText(
  prompt: string,
  model?: string
): Promise<GenerateResult> {
  const system = "Respond concisely. No markdown. Plain text only.";
  const fullPrompt = `${system}\n\n${prompt}`;
  return generateText(fullPrompt, model);
}
