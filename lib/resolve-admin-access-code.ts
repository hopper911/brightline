import fs from "fs";
import path from "path";

/**
 * Reads ADMIN_ACCESS_CODE from .env-style files when `process.env` is empty.
 * Fixes nested-app dev: vars live in repo-root `.env.local` while `next dev` cwd is `brightline/`.
 * Strips inline `# comments` (same rule as dotenv for unquoted values).
 */
function parseEnvKey(content: string, key: string): string | undefined {
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    if (k !== key) continue;
    let val = t.slice(eq + 1).trim();
    if (!val.startsWith('"') && !val.startsWith("'")) {
      const hash = val.indexOf(" #");
      if (hash !== -1) val = val.slice(0, hash).trim();
    }
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    const out = val.trim();
    return out || undefined;
  }
  return undefined;
}

export function resolveAdminAccessCode(): string | undefined {
  const fromEnv = process.env.ADMIN_ACCESS_CODE?.trim();
  if (fromEnv) return fromEnv;

  if (process.env.VERCEL === "1") return undefined;

  const dirs = [process.cwd(), path.resolve(process.cwd(), "..")];
  const names = [".env.local", ".env.development.local", ".env"];
  for (const dir of dirs) {
    for (const name of names) {
      const full = path.join(dir, name);
      try {
        if (!fs.existsSync(full)) continue;
        const raw = fs.readFileSync(full, "utf8");
        const v = parseEnvKey(raw, "ADMIN_ACCESS_CODE");
        if (v) return v;
      } catch {
        /* ignore */
      }
    }
  }
  return undefined;
}
