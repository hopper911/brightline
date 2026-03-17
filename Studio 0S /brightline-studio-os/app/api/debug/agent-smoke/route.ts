import { NextResponse } from "next/server";

import { runGenerateFinanceNarrative } from "@/lib/agents/financeAgent";
import { runGenerateOpsNarrative } from "@/lib/agents/operationsAgent";
import { runGenerateBiNarrative } from "@/lib/agents/biAgent";
import { runGetDailySummary } from "@/lib/agents/founderAgent";
import { runReceptionAnalysis } from "@/lib/agents/conciergeAgent";
import {
  runGenerateProjectBrief,
  runGenerateShotList,
  runGenerateChecklist,
  runSummarizeProject,
} from "@/lib/agents/producerAgent";
import { runMarketingCaption, runMarketingCaseStudy } from "@/lib/agents/marketingAgent";
import {
  runGenerateDeliveryChecklist,
  runGenerateDeliveryEmail,
  runSummarizeFinalAssets,
  runGenerateFollowup,
} from "@/lib/agents/deliveryAgent";
import { runGetRecentProjects, runGetRepeatClients } from "@/lib/agents/archivistAgent";

const ENDPOINT = "http://127.0.0.1:7343/ingest/cac45a4d-3c7a-433d-9b65-c6aea1e74420";
const SESSION_ID = "71c94b";

function dlog(hypothesisId: string, location: string, message: string, data: unknown) {
  // #region agent log
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": SESSION_ID },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      runId: "agent-smoke-api",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion agent log
}

async function runStep<T>(name: string, fn: () => Promise<T>) {
  dlog("H0", "app/api/debug/agent-smoke/route.ts:runStep", `start:${name}`, {});
  try {
    const out = await fn();
    dlog("H0", "app/api/debug/agent-smoke/route.ts:runStep", `ok:${name}`, {
      type: typeof out,
      keys: out && typeof out === "object" ? Object.keys(out as Record<string, unknown>) : null,
    });
    return { ok: true as const, out };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    dlog("H0", "app/api/debug/agent-smoke/route.ts:runStep", `fail:${name}`, { error: msg });
    return { ok: false as const, error: msg };
  }
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
  // Hypotheses:
  // H1: Tool registry missing IDs.
  // H2: SQLite schema mismatch.
  // H3: Ollama down should fallback (no throw).
  // H4: Archive agent depends on archive data/schema.
  dlog("H1", "app/api/debug/agent-smoke/route.ts:GET", "hypotheses", { H1: true, H2: true, H3: true, H4: true });

  const results: Record<string, unknown> = {};

  results.financeNarrative = await runStep("financeNarrative", async () => runGenerateFinanceNarrative());
  results.opsNarrative = await runStep("opsNarrative", async () => runGenerateOpsNarrative());
  results.biNarrative = await runStep("biNarrative", async () => runGenerateBiNarrative());
  results.founderSummary = await runStep("founderSummary", async () => runGetDailySummary());

  results.reception = await runStep("reception", async () =>
    runReceptionAnalysis({
      text: "Test inquiry: corporate headshots for 5 execs in NYC next month. Budget 5k.",
    })
  );

  results.producer = await runStep("producer", async () => {
    const projectId = `proj-test-${Date.now()}`;
    const projectName = "Test Project";
    const notes = "Corporate office shoot. 5 executive headshots, 1 team photo, 2 lifestyle scenes.";
    const brief = await runGenerateProjectBrief({ projectId, projectName, notes });
    const shots = await runGenerateShotList({ projectId, projectName, count: 5 });
    const checklist = await runGenerateChecklist({ projectId, projectName, kind: "shoot" });
    const summary = await runSummarizeProject({ projectId, projectName, notes });
    return { brief, shots, checklist, summary };
  });

  results.marketing = await runStep("marketing", async () => {
    const projectId = `proj-test-${Date.now()}`;
    const projectName = "Test Project";
    const cap = await runMarketingCaption({ projectId, projectName });
    const cs = await runMarketingCaseStudy({ projectId, projectName });
    return { cap, cs };
  });

  results.delivery = await runStep("delivery", async () => {
    const projectId = `proj-test-${Date.now()}`;
    const projectName = "Test Project";
    const checklist = await runGenerateDeliveryChecklist({ projectId, projectName });
    const email = await runGenerateDeliveryEmail({ projectId, projectName, clientName: "Alex" });
    const assets = await runSummarizeFinalAssets({ projectId, projectName, notes: "Final set: hero images + headshots." });
    const followup = await runGenerateFollowup({ projectId, projectName });
    return { checklist, email, assets, followup };
  });

  results.archive = await runStep("archive", async () => {
    const recent = runGetRecentProjects(3);
    const repeat = runGetRepeatClients(2);
    return { recentCount: recent.length, repeatCount: repeat.length };
  });

  return NextResponse.json({ ok: true, results });
}

