# Bright Line Studio OS

Mission control for your photography studio.

## Live preview

**Milestone 1 — Visual Mission Control Preview** is deployed at:

**[https://studio-os-blue-xi.vercel.app](https://studio-os-blue-xi.vercel.app)**

- Landing: `/`
- Studio map and room links: `/studio`
- Room pages: `/studio/reception`, `/studio/lounge`, `/studio/production`, `/studio/editing`, `/studio/delivery`, `/studio/marketing`, `/studio/archive`, `/studio/approvals`, `/studio/events`, `/studio/sessions`

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Build for production: `npm run build` then `npm run start`.

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
