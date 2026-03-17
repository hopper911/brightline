// Bright Line Studio OS – agent smoke test (debug mode)
// Runs a minimal pass across agents and logs results.

const ENDPOINT = "http://127.0.0.1:7343/ingest/cac45a4d-3c7a-433d-9b65-c6aea1e74420";
const SESSION_ID = "71c94b";

function log(hypothesisId, location, message, data) {
  // #region agent log
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": SESSION_ID },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      runId: "agent-smoke",
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion agent log
}

async function runStep(name, fn) {
  try {
    log("H0", "scripts/debug-agent-smoke.mjs:runStep", `start:${name}`, {});
    const out = await fn();
    log("H0", "scripts/debug-agent-smoke.mjs:runStep", `ok:${name}`, {
      keys: out && typeof out === "object" ? Object.keys(out) : typeof out,
    });
    return { ok: true, out };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("H0", "scripts/debug-agent-smoke.mjs:runStep", `fail:${name}`, { error: msg });
    return { ok: false, error: msg };
  }
}

async function main() {
  log("H0", "scripts/debug-agent-smoke.mjs:main", "begin", { node: process.version });
  log("H1", "scripts/debug-agent-smoke.mjs:main", "hypotheses", { H1: true, H2: true, H3: true, H4: true });

  const url = "http://localhost:3000/api/debug/agent-smoke";
  const res = await fetch(url);
  const text = await res.text();
  log("H0", "scripts/debug-agent-smoke.mjs:main", "response", { status: res.status, bytes: text.length });

  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }

  const summary =
    json && json.results
      ? Object.fromEntries(
          Object.entries(json.results).map(([k, v]) => [k, v && v.ok ? "ok" : `fail:${v && v.error ? v.error : "unknown"}`])
        )
      : { error: `Non-JSON response (status ${res.status})` };

  log("H0", "scripts/debug-agent-smoke.mjs:main", "end", { summary });
  // eslint-disable-next-line no-console
  console.log("Agent smoke summary:", summary);
}

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  log("H0", "scripts/debug-agent-smoke.mjs:main", "fatal", { error: msg });
  // eslint-disable-next-line no-console
  console.error(msg);
  process.exitCode = 1;
});

