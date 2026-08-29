import type { ProjectVerificationNetworkResult } from "@/lib/platform/projects/verification/types";
import { assertPublicHttpUrlResolved } from "@/lib/ssrf-guard";
import { isTrustedR2Host } from "@/lib/r2";

const DEFAULT_TIMEOUT_MS = 8_000;

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function hostAllowed(hostname: string, extraSuffixes?: readonly string[]): boolean {
  const h = hostname.toLowerCase();
  if (isTrustedR2Host(h)) return true;
  if (!extraSuffixes?.length) return false;
  return extraSuffixes.some((suffix) => {
    const s = suffix.toLowerCase();
    return h === s || h.endsWith(`.${s}`);
  });
}

/**
 * Lightweight HEAD probe — no body download. Transient failures are flagged separately.
 */
export async function headPublicUrl(
  rawUrl: string,
  options?: {
    origin?: string;
    timeoutMs?: number;
    allowedHostSuffixes?: readonly string[];
  }
): Promise<ProjectVerificationNetworkResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  try {
    const resolved = (await assertPublicHttpUrlResolved(rawUrl, options?.origin)).toString();
    const host = new URL(resolved).hostname;
    if (!hostAllowed(host, options?.allowedHostSuffixes)) {
      return { ok: false, transient: false, detail: "Host not allowed for verification probe." };
    }

    const res = await fetch(resolved, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (res.ok || res.status === 304) {
      return { ok: true, transient: false, statusCode: res.status };
    }

    const transient = isTransientStatus(res.status);
    return {
      ok: false,
      transient,
      statusCode: res.status,
      detail: `HTTP ${res.status}`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    const transient =
      message.includes("timeout") ||
      message.includes("Timeout") ||
      message.includes("aborted") ||
      message.includes("ECONNRESET") ||
      message.includes("ENOTFOUND");
    return { ok: false, transient, detail: message };
  }
}
