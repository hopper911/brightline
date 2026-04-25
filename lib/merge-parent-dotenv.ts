import fs from "fs";
import path from "path";

/** Strip curly/smart quotes often pasted from rich text. */
function stripQuotes(val: string): string {
  let s = val.replace(/[\u201C\u201D\u2018\u2019]/g, "");
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1);
  }
  return s.trim();
}

function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    if (!key) continue;
    let val = t.slice(eq + 1).trim();
    if (!val.startsWith('"') && !val.startsWith("'")) {
      const hash = val.indexOf(" #");
      if (hash !== -1) val = val.slice(0, hash).trim();
    }
    out[key] = stripQuotes(val);
  }
  return out;
}

let mergedOnce = false;

/**
 * Fills `process.env` from repo-root `.env*` when those keys are missing.
 * `next dev` cwd is `brightline/brightline`; R2 and other secrets often live in parent `.env.local`.
 */
export function mergeParentDotenvIntoProcess(): void {
  if (mergedOnce) return;
  mergedOnce = true;
  if (process.env.VERCEL === "1") return;

  const parentDir = path.join(process.cwd(), "..");
  const names = [".env", ".env.development.local", ".env.local"] as const;
  const combined: Record<string, string> = {};
  for (const name of names) {
    const full = path.join(parentDir, name);
    try {
      if (!fs.existsSync(full)) continue;
      const parsed = parseEnvFile(fs.readFileSync(full, "utf8"));
      Object.assign(combined, parsed);
    } catch {
      /* ignore */
    }
  }
  for (const [key, val] of Object.entries(combined)) {
    if (!val) continue;
    const cur = process.env[key];
    if (cur === undefined || cur === "") {
      process.env[key] = val;
    }
  }
}
