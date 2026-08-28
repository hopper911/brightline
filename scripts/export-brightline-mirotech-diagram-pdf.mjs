#!/usr/bin/env node
/**
 * Export docs/brightline-mirotech-relations.html → landscape grayscale PDF.
 * Usage: node scripts/export-brightline-mirotech-diagram-pdf.mjs
 */
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = path.join(root, "docs/brightline-mirotech-relations.html");
const pdfPath = path.join(root, "docs/brightline-mirotech-relations.pdf");
const fileUrl = `file://${htmlPath}`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(90_000);
  await page.goto(fileUrl, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForFunction(
    () =>
      document.body.dataset.mermaidReady === "true" ||
      document.body.dataset.mermaidError,
    { timeout: 90_000 }
  );
  const err = await page.evaluate(() => document.body.dataset.mermaidError);
  if (err) throw new Error(`Mermaid render failed: ${err}`);
  await page.waitForSelector(".mermaid svg", { timeout: 10_000 });
  await page.waitForTimeout(800);

  await page.pdf({
    path: pdfPath,
    landscape: true,
    format: "Letter",
    printBackground: false,
    preferCSSPageSize: true,
    margin: { top: "0.35in", right: "0.35in", bottom: "0.35in", left: "0.35in" },
  });

  console.log(`Wrote ${pdfPath}`);
} finally {
  await browser.close();
}
