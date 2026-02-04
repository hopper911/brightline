This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment & secrets parity (Vercel)

- Keep Preview and Production env vars in parity. Missing secrets often surface only at runtime.
- Use `brightline/.env.example` as the canonical list for both environments.
- Prefer identical values across Preview and Production unless a setting is destructive (e.g., seed flags).
- Prisma runs only in the Node runtime; avoid Edge for any Prisma-backed routes.
- For Neon, use a pooled `DATABASE_URL` and set `DIRECT_URL` for migrations.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Case studies (MDX workflow)

Case studies live in `content/projects` as MDX files with frontmatter. Only items with `status: PUBLISHED` render on `/work` and `/work/[slug]`.

Required frontmatter fields:

- `title`
- `category`
- `categorySlug`
- `location`
- `year`
- `cover`
- `overview`
- `goals` (array)
- `deliverables` (array)
- `gallery` (array)
- `results`
- `cta`
- `status` (`PUBLISHED` or `DRAFT`)

Optional frontmatter fields:

- `tags` (array)
- `featured` (boolean)

Editing flow:

1. Add or update a file at `content/projects/<slug>.mdx`.
2. Set `status: PUBLISHED` when ready to ship.
3. Ensure `cover` and `gallery` point to valid image paths in `public/`.
4. Visit `/work` to confirm filters + cards.

## Sentry setup

1. Install the Sentry Next.js SDK (already in `package.json`).
2. Add env vars in Vercel and `.env.local`:
   - `SENTRY_DSN`
   - `NEXT_PUBLIC_SENTRY_DSN`
   - `SENTRY_ORG`
   - `SENTRY_PROJECT`
   - `SENTRY_AUTH_TOKEN`
   - `SENTRY_ENVIRONMENT` (optional)
3. Deploy; source maps are enabled in `next.config.ts`.

Note: `sentry.properties` reads `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` from env at build time.

## Operations: database backups (Neon)

This project uses Neon Postgres. Neon provides automated backups and point-in-time recovery (PITR).

Recommended baseline:

1. Enable PITR in the Neon project settings.
2. Confirm the retention window matches your recovery needs (at least 7–14 days).
3. For manual snapshots, create a “branch” in Neon before risky changes (schema/data migrations).
4. For exports, use pg_dump against the direct URL:

```
pg_dump "${DIRECT_URL}" --format=custom --file=backup.dump
```

Restore checklist:

1. Create a new Neon branch for recovery.
2. Restore to that branch with pg_restore.
3. Validate app behavior, then promote/replace.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
