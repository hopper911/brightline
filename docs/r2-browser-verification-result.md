# R2 Browser Verification Result

Use this document to record pass/fail evidence and environment details after running the [Browse R2 verification steps](.cursor/plans/verify-r2-browser-fix_62761075.plan.md).

## Evidence template

| Field | Value |
|-------|--------|
| **Result** | ☐ Pass ☐ Fail |
| **Environment** | local / deployed |
| **Timestamp** | (e.g. 2025-03-04 14:30 UTC) |
| **Source / pillar** | (e.g. Portfolio + arc, or Custom prefix used) |
| **Prefix requested** | (e.g. `portfolio/arc/web_full/`) |
| **Screenshot** | (path or note: e.g. "modal-populated.png" or "N/A") |
| **Notes** | (optional) |

---

## If pass

- Image list renders in the Browse R2 modal for the tested source/pillar.
- No `Invalid character in header content ["authorization"]` error.
- Capture a screenshot of the populated modal and note environment above.

---

## If fail

1. **Record here:**
   - Exact error message shown in the modal: _______________________
   - Same timestamp, environment, and prefix as in the table above.

2. **Gather `/api/admin/r2-list` error details:**
   - **Response body:** Open DevTools → Network → select the `r2-list` POST request → Response tab. Copy the JSON. The API returns `error`, `timestamp`, `prefix` (if available), and optionally `code` (e.g. `R2_HEADER_ERROR`) and `details` for targeted debug.
   - **Server logs:** In the terminal where Next.js is running (or Vercel function logs), search for `R2_LIST_ERROR` and copy the stack or message. Use `timestamp` from the response to correlate.
   - **Request payload:** From the same Network request, Request payload: `prefix` and any other fields.
   - **Copy error details:** In the Browse R2 modal, when an error is shown, use the "Copy error details" button to copy a JSON blob (error, timestamp, prefix, environment) for pasting into this doc or into a bug report.

3. **Continue targeted debug:**
   - Confirm [lib/storage-r2.ts](../lib/storage-r2.ts) `normalizeEnv()` is applied to R2 credentials (no newlines/quotes in `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`).
   - Confirm the request path: POST `/api/admin/r2-list` with body `{ "prefix": "portfolio/…" }` or `work/…`.
   - Check runtime env: ensure the same env vars are set where the app runs (local `.env` vs Vercel env).

---

## Changelog

| Date | Result | Environment | Note |
|------|--------|-------------|------|
| (fill when you run verification) | | | |
