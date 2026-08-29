#!/usr/bin/env node
/**
 * Lighthouse performance snapshot — same URLs/metrics as Phase 15A baseline.
 *
 *   node scripts/perf-lighthouse-snapshot.mjs
 *   node scripts/perf-lighthouse-snapshot.mjs --json /tmp/perf.json
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const URLS = [
  { label: "brightline-home", url: "https://brightlinephotography.com/" },
  { label: "brightline-work", url: "https://brightlinephotography.com/work" },
  {
    label: "brightline-project",
    url: "https://brightlinephotography.com/work/shared/mirotech-ops-intelligence-command-center",
  },
  { label: "mirotech-home", url: "https://mirotech.solutions/" },
];

const jsonOut = process.argv.includes("--json")
  ? process.argv[process.argv.indexOf("--json") + 1]
  : null;

const results = [];

for (const { label, url } of URLS) {
  const out = join(tmpdir(), `lh-${label}.json`);
  console.log(`\n▶ ${label}: ${url}`);
  try {
    execSync(
      `npx lighthouse "${url}" --only-categories=performance --output=json --output-path="${out}" --chrome-flags="--headless --no-sandbox" --quiet`,
      { stdio: "inherit" }
    );
    const report = JSON.parse(readFileSync(out, "utf8"));
    const a = report.audits;
    const row = {
      label,
      url,
      score: Math.round(report.categories.performance.score * 100),
      lcp: a["largest-contentful-paint"].displayValue,
      fcp: a["first-contentful-paint"].displayValue,
      tbt: a["total-blocking-time"].displayValue,
      ttfb: a["server-response-time"].displayValue,
      cls: a["cumulative-layout-shift"].displayValue,
    };
    results.push(row);
    console.log(
      `  score=${row.score} LCP=${row.lcp} FCP=${row.fcp} TBT=${row.tbt} TTFB=${row.ttfb}`
    );
  } catch (err) {
    console.error(`  failed: ${err instanceof Error ? err.message : err}`);
    results.push({ label, url, error: String(err) });
  }
}

if (jsonOut) {
  writeFileSync(jsonOut, JSON.stringify({ capturedAt: new Date().toISOString(), results }, null, 2));
  console.log(`\nWrote ${jsonOut}`);
}
