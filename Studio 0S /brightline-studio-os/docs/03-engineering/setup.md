# Vercel deployment checklist – Bright Line Studio OS

## Goal

**Milestone 1 — Visual Mission Control Preview**: Deploy the UI shell only. No SQLite, no local file system, no Python. Mock data only.

---

## Visual-only deployment readiness (verified)

- **Safe for deployment:** Yes. No `app/` or `components/` imports of `@/lib/db`, `@/lib/events`, `fs`, `path`, `better-sqlite3`, or `child_process`. Server-only code lives in `lib/db/`, `lib/events/logger.ts`, and `scripts/`.
- **Build-ready:** `npm run build` succeeds. All routes compile; `/studio/dashboard`, `/studio/crm`, and `/studio/publishing` use mock data only.
- **UI-only mode:** Dashboard and room pages use `lib/studio/mockData.ts` only (MOCK_ROOMS, MOCK_SUMMARY, MOCK_PROJECTS, studioRooms). No environment variables required for the visual deploy.

---

## Pre-deploy checks

- [ ] **No DB in visual routes** – `/studio/dashboard` and all `/studio/*` must not import `@/lib/db` or `@/lib/events` (they pull in better-sqlite3). Reception and Marketing actions use mock data only.
- [ ] **Single mock source** – Room list, summary cards, and marketing project list come from `lib/studio/mockData.ts` only.
- [ ] **Client boundaries** – Any component using `useState`, `onClick`, or form actions that need client state has `"use client"` at the top.
- [ ] **No local-only modules in UI path** – Nothing in `app/` or `components/` should import `better-sqlite3`, `fs`, `path` (for file reads), or run Python/Ollama.

---

## Local build checks

Run in project root (e.g. `brightline-studio-os`):

```bash
npm run build
```

- If the build fails, do **not** deploy. Fix errors first.
- Common causes:
  - **Bad imports** – Wrong path, missing file, or broken `@/` alias.
  - **Server/client mismatch** – Using hooks or browser APIs in a component without `"use client"`.
  - **Native module in bundle** – `better-sqlite3` or similar imported in a route or component used at build time.
  - **Tailwind/class issues** – Less common; fix any reported class or config errors.

Then run:

```bash
npm run start
```

- Open `http://localhost:3000` and confirm production build works.
- Click through: `/`, `/studio/dashboard`, `/studio/crm`, `/studio/publishing`, and other room links.

---

## Branch strategy for visual prototype

1. Create a branch for the visual-only deploy:
   ```bash
   git checkout -b visual-prototype
   git add .
   git commit -m "Visual prototype deploy checkpoint"
   git push -u origin visual-prototype
   ```
2. In Vercel, import the repo and deploy **that branch** first.
3. Keep `main` (or your default branch) for later when you add SQLite/backend.
4. After the visual preview is approved, you can merge or add backend on another branch.

---

## Vercel settings (keep simple)

- **Framework preset**: Next.js (auto-detected).
- **Root directory**: If the app is in a subfolder (e.g. `brightline-studio-os`), set that as the root. If the repo root is the app, leave default.
- **Build command**: `next build` (default).
- **Output**: Default.
- **Env vars**: None required for the visual-only deploy.

---

## What to postpone until after visual deploy

Do **not** wire these into the deployed app until the visual milestone is done:

- SQLite-backed mission control or room data
- Persisted event logging (DB)
- Persisted approvals or drafts (DB)
- Python image scan or local scripts
- Ollama or other local AI
- Local folder scanning
- Background jobs

Re-enable them later in a separate branch or after switching to a server-compatible DB (e.g. Postgres/Supabase) if you move off local SQLite.

---

## After deployment succeeds

- Confirm from phone and desktop: map, room links, summary cards, and styling look correct.
- Then plan **Phase 2** (e.g. Reception/Marketing with mock-only actions first, then optional DB-backed logging and drafts when you’re ready and deployability is preserved).

---

## Live preview (Milestone 1 done)

- **URL:** [https://studio-os-blue-xi.vercel.app](https://studio-os-blue-xi.vercel.app)
- Map, room pages, summary cards, and styling are deployed; Reception and Marketing use mock data only.
