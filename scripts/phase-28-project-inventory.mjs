/**
 * Phase 28 — project inventory snapshot (read-only, no server-only imports).
 * Usage: npx tsx scripts/phase-28-project-inventory.mjs
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const STATE_PREFIX = "project_workflow_state:v1:";

function emptyInventory() {
  return {
    total: 0,
    draft: 0,
    needsContent: 0,
    needsMedia: 0,
    review: 0,
    approved: 0,
    published: 0,
    verified: 0,
    warning: 0,
    failed: 0,
    unchecked: 0,
  };
}

function verificationStatus(stored) {
  if (!stored) return "unchecked";
  if (stored.verificationFailed) return "failed";
  if (stored.verificationWarning) return "warning";
  if (stored.verificationHealthy) return "verified";
  return "unchecked";
}

function bucketFromLifecycle(lifecycle) {
  switch (lifecycle) {
    case "IN_REVIEW":
      return "review";
    case "APPROVED":
      return "approved";
    case "PUBLISHED":
      return "published";
    case "CONTENT_READY":
      return "needsMedia";
    case "MEDIA_READY":
      return "needsMedia";
    case "DRAFT":
    case "ARCHIVED":
    default:
      return "draft";
  }
}

function bump(inv, bucket) {
  inv.total += 1;
  if (bucket === "draft") inv.draft += 1;
  if (bucket === "needsContent") inv.needsContent += 1;
  if (bucket === "needsMedia") inv.needsMedia += 1;
  if (bucket === "review") inv.review += 1;
  if (bucket === "approved") inv.approved += 1;
  if (bucket === "published") inv.published += 1;
}

function bumpVerification(inv, status, isPublished) {
  if (!isPublished) return;
  if (status === "verified") inv.verified += 1;
  else if (status === "warning") inv.warning += 1;
  else if (status === "failed") inv.failed += 1;
  else inv.unchecked += 1;
}

async function loadWorkflowStates() {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { startsWith: STATE_PREFIX } },
  });
  const map = new Map();
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.value ?? "");
      if (parsed?.lifecycle) {
        map.set(row.key.slice(STATE_PREFIX.length), parsed);
      }
    } catch {
      /* skip */
    }
  }
  return map;
}

function deriveBrightlineLifecycle(row) {
  if (row.published) return "PUBLISHED";
  const hasSummary = Boolean(row.summary?.trim());
  const hasBody = Boolean(row.description?.trim());
  const hasHero = Boolean(row.heroMediaId);
  const hasMedia = row._count.media > 0;
  if (!hasSummary && !hasBody) return "DRAFT";
  if (!hasHero && !hasMedia) return "CONTENT_READY";
  if (!row.seoTitle?.trim() || !row.metaDescription?.trim()) return "MEDIA_READY";
  return "DRAFT";
}

async function brightlineInventory(storedStates) {
  const inv = emptyInventory();
  const projects = await prisma.workProject.findMany({
    select: {
      id: true,
      published: true,
      summary: true,
      description: true,
      heroMediaId: true,
      seoTitle: true,
      metaDescription: true,
      _count: { select: { media: true } },
    },
  });

  for (const row of projects) {
    const refKey = `brightline:work-project:${row.id}`;
    const stored = storedStates.get(refKey);
    const derived = deriveBrightlineLifecycle(row);
    const lifecycle =
      stored?.lifecycle === "ARCHIVED"
        ? "ARCHIVED"
        : row.published
          ? "PUBLISHED"
          : stored?.lifecycle ?? derived;
    if (lifecycle === "ARCHIVED") continue;
    const bucket = bucketFromLifecycle(lifecycle);
    if (bucket === "needsMedia" && !row.summary?.trim()) {
      bump(inv, "needsContent");
    } else {
      bump(inv, bucket);
    }
    bumpVerification(inv, verificationStatus(stored), row.published);
  }
  return inv;
}

function deriveMirotechLifecycle(project) {
  const status = String(project.status ?? "").toUpperCase();
  if (status === "PUBLISHED") return "PUBLISHED";
  if (status === "REVIEW") return "IN_REVIEW";
  const hasSummary = Boolean(project.summary?.trim());
  const hasHero =
    Boolean(project.heroImage?.trim()) || Boolean(project.thumbnailImage?.trim());
  if (!hasSummary) return "DRAFT";
  if (!hasHero) return "CONTENT_READY";
  return "MEDIA_READY";
}

async function fetchHubProjects() {
  const base = process.env.MIROTECH_CONTENT_API_URL?.replace(/\/$/, "");
  const secret = process.env.CONTENT_API_SECRET?.trim();
  if (!base || !secret) {
    throw new Error("MIROTECH_CONTENT_API_URL and CONTENT_API_SECRET required for hub inventory");
  }
  const res = await fetch(`${base}/api/content/v1/projects?site=MIROTECH`, {
    headers: { "x-content-api-secret": secret },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Hub projects fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.projects) ? data.projects : Array.isArray(data) ? data : [];
}

async function mirotechInventory(storedStates) {
  const inv = emptyInventory();
  const projects = await fetchHubProjects();
  for (const project of projects) {
    const refKey = `mirotech:mirotech-case-study:${project.id}`;
    const stored = storedStates.get(refKey);
    const published = String(project.status ?? "").toUpperCase() === "PUBLISHED";
    const derived = deriveMirotechLifecycle(project);
    const lifecycle =
      stored?.lifecycle === "ARCHIVED"
        ? "ARCHIVED"
        : published
          ? "PUBLISHED"
          : stored?.lifecycle ?? derived;
    if (lifecycle === "ARCHIVED") continue;
    const bucket = bucketFromLifecycle(lifecycle);
    bump(inv, bucket);
    bumpVerification(inv, verificationStatus(stored), published);
  }
  return inv;
}

const storedStates = await loadWorkflowStates();
const brightline = await brightlineInventory(storedStates);
const clientPublished = await prisma.project.count({ where: { published: true } });
const clientTotal = await prisma.project.count();
const galleryCount = await prisma.gallery.count();
const workPublished = await prisma.workProject.count({ where: { published: true } });
const workTotal = await prisma.workProject.count();
let mirotech = emptyInventory();
let mirotechError = null;
try {
  mirotech = await mirotechInventory(storedStates);
} catch (err) {
  mirotechError = err instanceof Error ? err.message : String(err);
}

console.log(
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      dataSource: process.env.DATABASE_URL ? "database-connected" : "no-database",
      brightline,
      brightlineDb: { workTotal, workPublished, clientTotal, clientPublished, galleryCount },
      mirotech,
      mirotechError,
    },
    null,
    2
  )
);

await prisma.$disconnect();
