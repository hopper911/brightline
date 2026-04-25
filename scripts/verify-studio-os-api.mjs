#!/usr/bin/env node
/**
 * Verify Studio OS routes: POST /api/projects/create, publish, generate-copy
 *
 * Usage:
 *   cd brightline && npm run studio-os:verify
 *
 * Env (brightline/.env.local or .env):
 *   AUTOMATION_API_SECRET or BL_INTERNAL_API_TOKEN — required
 *   STUDIO_OS_BASE_URL — optional, default http://localhost:3000
 *   OPENAI_API_KEY — optional; generate-copy skipped if missing unless --require-openai
 *
 * Flags:
 *   --skip-openai     Skip generate-copy (default if OPENAI_API_KEY unset)
 *   --require-openai  Fail if generate-copy cannot run
 *   --cleanup         DELETE the test project after (default: true for local, false if --no-cleanup)
 *   --no-cleanup      Leave the test project in the DB
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });

const args = process.argv.slice(2);
const skipOpenAIFlag = args.includes("--skip-openai");
const requireOpenAI = args.includes("--require-openai");
const noCleanup = args.includes("--no-cleanup");

const base =
  process.env.STUDIO_OS_BASE_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

const token = (
  process.env.AUTOMATION_API_SECRET ||
  process.env.BL_INTERNAL_API_TOKEN ||
  ""
).trim();

const openaiKey = (process.env.OPENAI_API_KEY || "").trim();

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function post(path, body) {
  const url = `${base}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { _raw: text };
  }
  return { ok: res.ok, status: res.status, json, url };
}

async function del(path) {
  const url = `${base}${path}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { _raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

async function main() {
  console.log(`Studio OS API verify → ${base}\n`);

  if (!token) {
    console.error(
      "[FAIL] Set AUTOMATION_API_SECRET or BL_INTERNAL_API_TOKEN in brightline/.env.local"
    );
    process.exit(1);
  }

  const stamp = Date.now();
  const title = `Studio OS verify ${stamp}`;

  // 1) Create
  console.log("1) POST /api/projects/create …");
  const createBody = {
    title,
    client: "Verify Client",
    category: "architecture",
    location: "Jersey City, NJ",
    year: new Date().getFullYear(),
    opening: "Opening line for verify.",
    context: "Context for verify.",
    approach: "Approach for verify.",
    highlight: "Highlight.",
    closing: "Closing.",
    published: false,
  };

  const c = await post("/api/projects/create", createBody);
  if (!c.ok || !c.json.ok) {
    console.error("[FAIL] create", c.status, JSON.stringify(c.json, null, 2));
    process.exit(1);
  }
  const id = c.json.websiteProjectId || c.json.project?.id;
  if (!id) {
    console.error("[FAIL] create response missing id", c.json);
    process.exit(1);
  }
  console.log(`   [OK] created id=${id}`);
  if (c.json.draftUrl) console.log(`   draftUrl: ${c.json.draftUrl}`);

  let failed = false;

  // 2) Publish
  console.log("\n2) POST /api/projects/publish …");
  const p = await post("/api/projects/publish", { id, published: true });
  if (!p.ok || !p.json.ok) {
    console.error("[FAIL] publish", p.status, JSON.stringify(p.json, null, 2));
    failed = true;
  } else {
    console.log(`   [OK] liveUrl: ${p.json.liveUrl || "(check published flag)"}`);
  }

  // 3) Unpublish (restore draft)
  console.log("\n3) POST /api/projects/publish (unpublish) …");
  const u = await post("/api/projects/publish", { id, published: false });
  if (!u.ok || !u.json.ok) {
    console.error("[FAIL] unpublish", u.status, JSON.stringify(u.json, null, 2));
    failed = true;
  } else {
    console.log("   [OK] unpublished");
  }

  // 4) Generate copy
  if (!openaiKey && requireOpenAI) {
    console.error("\n[FAIL] --require-openai but OPENAI_API_KEY is not set");
    failed = true;
  }

  const runCopy = Boolean(openaiKey && !skipOpenAIFlag);

  if (runCopy) {
    console.log("\n4) POST /api/projects/generate-copy …");
    const g = await post("/api/projects/generate-copy", {
      client: "Verify Client",
      category: "architecture",
      location: "Jersey City, NJ",
      year: new Date().getFullYear(),
      notes: "Short verify notes for AI.",
    });
    if (!g.ok || !g.json.ok) {
      console.error("[FAIL] generate-copy", g.status, JSON.stringify(g.json, null, 2));
      failed = true;
    } else {
      console.log("   [OK] generate-copy returned fields (opening, context, …)");
    }
  } else if (skipOpenAIFlag) {
    console.log("\n4) POST /api/projects/generate-copy — skipped (--skip-openai)");
  } else {
    console.log("\n4) POST /api/projects/generate-copy — skipped (set OPENAI_API_KEY in .env.local)");
  }

  // 5) Cleanup
  if (!noCleanup && id) {
    console.log("\n5) DELETE /api/projects/[id] (cleanup test row) …");
    const d = await del(`/api/projects/${id}`);
    if (!d.ok) {
      console.warn("[WARN] delete failed", d.status, JSON.stringify(d.json, null, 2));
      console.warn(`   Remove manually in admin: /admin/projects/${id}/edit`);
    } else {
      console.log("   [OK] deleted test project");
    }
  } else if (id) {
    console.log(`\n5) Cleanup skipped — test project still in DB: ${id}`);
  }

  if (failed) {
    console.log("\n[FAIL] One or more steps failed.");
    process.exit(1);
  }
  console.log("\n[OK] Studio OS API routes responded as expected.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
