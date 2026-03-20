# Bright Line Studio OS

Mission control for your photography studio.

## Live preview

**Milestone 1 — Visual Mission Control Preview** is deployed at:

**[https://studio-os-blue-xi.vercel.app](https://studio-os-blue-xi.vercel.app)**

- Landing: `/`
- Studio map and room links: `/studio` (redirects to `/studio/dashboard`)
- Room pages: `/studio/dashboard`, `/studio/crm`, `/studio/crm/leads`, `/studio/crm/clients`, `/studio/crm/inquiry`, `/studio/crm/lounge`, `/studio/projects`, `/studio/projects/new`, `/studio/projects/jobs`, `/studio/projects/archive`, `/studio/production`, `/studio/production/editing`, `/studio/production/delivery`, `/studio/production/approvals`, `/studio/publishing`, `/studio/finance`, `/studio/settings`, `/studio/settings/automation`, `/studio/dashboard/events`, `/studio/dashboard/sessions`, `/studio/dashboard/strategy`

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Build for production: `npm run build` then `npm run start`.

## Database (Prisma + PostgreSQL)

CRM and Projects modules use PostgreSQL via Prisma. The legacy SQLite layer (`lib/db`) remains for other routes.

### Setup

1. Start Postgres (Docker):

```bash
docker-compose up -d postgres
```

2. Set `DATABASE_URL` in `.env`:

```
DATABASE_URL="postgresql://studio:studio_password@localhost:5432/studio_os?schema=public"
```

3. Run migrations:

```bash
npm run db:migrate
```

4. (Optional) Open Prisma Studio to inspect data:

```bash
npm run db:studio
```

### Commands

| Command | Purpose |
|---------|---------|
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Create and apply migrations |
| `npm run db:studio` | Open Prisma Studio |

## Optional: Local AI (Ollama)

Studio OS uses **Ollama** for local-first AI. If Ollama is not installed or not running, Studio OS will **fallback** to deterministic templates.

- Install Ollama (macOS): `https://ollama.com/download`
- Start the server:

```bash
ollama serve
```

- In a second terminal, pull a model:

```bash
ollama pull llama3
```

If you see `command not found: ollama`, Ollama is not installed (or not on your PATH yet). Reopen Terminal after installation.

## Tech

- Next.js (App Router), TypeScript, Tailwind
- Visual-only deploy: mock data from `lib/studio/mockData.ts`; no SQLite/DB at request time
- See `docs/architecture.md` and `docs/roadmap.md` for structure and phases

## What's next (Phase 2)

- Reception: inquiry box with mock analysis (already in place); later wire event logging when DB is added
- Marketing: project selector and mock caption generation (already in place); later wire drafts/DB
- Event feed UI using mock state
- Approval queue UI using mock state
- Then: optional SQLite locally or Postgres/Supabase for production

See `docs/deployment-checklist.md` for Vercel deploy steps and what to postpone until after the visual is approved.
