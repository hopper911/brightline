import fs from "node:fs";
import path from "node:path";

/** Matches brightlinephotography.co but not .com */
export const FORBIDDEN_CO_DOMAIN_PATTERN = /brightlinephotography\.co(?!m)/g;

/**
 * Files that may reference legacy .co intentionally (redirects, alias maps, docs, guard itself).
 * Paths relative to the Brightline app root (`brightline/brightline`).
 */
export const LEGACY_CO_DOMAIN_ALLOWLIST = Object.freeze([
  "vercel.json",
  "../vercel.json",
  "lib/truth/brand-lock.ts",
  "lib/truth/canonical-domain.ts",
  "lib/truth/canonical-domain.test.ts",
  "lib/platform/tenants/registry.ts",
  "lib/platform/tenants/resolver.test.ts",
  "DEPLOY.md",
  "docs/architecture/current-state.md",
  ".cursor/rules/brightline-canonical-domain.mdc",
]);

const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".md", ".json", ".mdc", ".example"]);

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "coverage",
  ".vercel",
]);

export type CoDomainViolation = {
  file: string;
  line: number;
  snippet: string;
};

function normalizeAllowPath(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function isAllowlisted(relativePath: string): boolean {
  const normalized = normalizeAllowPath(relativePath);
  return LEGACY_CO_DOMAIN_ALLOWLIST.some(
    (allowed) => normalized === allowed || normalized.endsWith(`/${allowed}`)
  );
}

function scanFile(appRoot: string, relativePath: string): CoDomainViolation[] {
  if (isAllowlisted(relativePath)) return [];

  const fullPath = path.join(appRoot, relativePath);
  const content = fs.readFileSync(fullPath, "utf8");
  const violations: CoDomainViolation[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    FORBIDDEN_CO_DOMAIN_PATTERN.lastIndex = 0;
    if (FORBIDDEN_CO_DOMAIN_PATTERN.test(line)) {
      violations.push({
        file: normalizeAllowPath(relativePath),
        line: i + 1,
        snippet: line.trim().slice(0, 120),
      });
    }
  }

  return violations;
}

function walkDir(appRoot: string, dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".env")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walkDir(appRoot, full, out);
      continue;
    }
    const ext = path.extname(entry.name);
    if (!SCAN_EXTENSIONS.has(ext)) continue;
    out.push(path.relative(appRoot, full));
  }
}

/** Scan tracked source/docs for mistaken brightlinephotography.co (non-.com) usage. */
export function findLegacyCoDomainViolations(appRoot: string = process.cwd()): CoDomainViolation[] {
  const files: string[] = [];
  walkDir(appRoot, appRoot, files);
  return files.flatMap((file) => scanFile(appRoot, file));
}
