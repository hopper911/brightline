# Production deploy checklist (Bright Line)

## What already happened

You successfully shipped the app with:

```bash
vercel deploy --prod
```

That uploads **the current local files** to Vercel, runs `npm run build` (including `prisma generate`), and assigns the deployment to production. It does **not** run `prisma migrate deploy` on your Neon database.

So **application code** can be on production **before** the **database schema** has caught up, if migrations were never applied there.

---

## Why `npm run deploy:prod` did not run earlier

The gated script [`scripts/deploy-prod.sh`](../scripts/deploy-prod.sh) (see `npm run deploy:prod` in [`package.json`](../package.json)) stops unless:

| Requirement | Purpose |
|-------------|---------|
| **Clean git working tree** | Avoid deploying uncommitted code that never lands in Git. |
| **Branch equals `main` by default** | Match your release branch; override with `REQUIRED_GIT_BRANCH=your-branch`. |
| **`DATABASE_URL` and `DIRECT_URL` in the environment** | So `npx prisma migrate deploy` targets the right Postgres (Neon pooled + direct). |
| **You type `DEPLOY`** | Confirms you intend to migrate production and deploy. |

If the tree was dirty, the branch was e.g. `studio-os-cms-production-20260425`, or prod DB URLs were not exported in the shell, the script correctly refused to continue.

---

## What `package.json` scripts do

- **`deploy:prod`** — Runs `bash scripts/deploy-prod.sh`: migrate **then** `vercel deploy --prod`. Requires clean tree, allowed branch, both DB URLs, and typing `DEPLOY`.
- **`deploy:check`** — Runs `node scripts/check-prod-deploy-ready.mjs`: **read-only** checklist (git, env presence, migration folder count, optional `prisma migrate status` if URLs are set). **Does not** run migrations or deploy. **Does not** print secret values or connection strings.
- **`db:migrate`** — `prisma migrate deploy` only (use only when you intend to apply migrations, with correct `DATABASE_URL` / `DIRECT_URL`).

---

## Prisma migrations in this repo

- **Config:** [`prisma/schema.prisma`](../prisma/schema.prisma) uses `DATABASE_URL` and `DIRECT_URL` (Neon: pooled + direct).
- **Migrations:** [`prisma/migrations`](../prisma/migrations) contains many versioned folders with `migration.sql`. Newer examples include client delivery / gallery / Mission Control email work.

If production was deployed via `vercel deploy --prod` **without** a prior `prisma migrate deploy` against **production**, pending migrations may still need to be applied.

**Do not** use `prisma migrate reset` or `prisma db push` against production.

---

## Safely run production migrations (manual, explicit)

Only after you have **production** connection strings from Neon (and you understand you are mutating **production**):

1. In a **trusted shell** (not in committed files), set:

   ```bash
   export DATABASE_URL="…"   # production — do not commit or paste into tickets
   export DIRECT_URL="…"     # production direct (non-pooled) per Neon + Prisma
   ```

2. From the **app root** (directory with `package.json`):

   ```bash
   npx prisma migrate status   # optional: inspect without applying
   npx prisma migrate deploy   # applies pending migrations only
   ```

3. Do **not** paste full URLs into chat or screenshots with credentials.

This repository’s **`deploy:check`** does not load `.env` on purpose, so you must **export** variables in the shell if you want the checker to run `migrate status` against a specific database.

---

## Full gated release (git + migrate + Vercel)

Example flow when your production branch is `main`:

```bash
cd /path/to/brightline    # app root

git status
git add .
git commit -m "Production release"
git checkout main
git merge studio-os-cms-production-20260425   # or your release branch

export DATABASE_URL="…"
export DIRECT_URL="…"

npm run deploy:check
npm run deploy:prod    # then type DEPLOY when prompted
```

If production is released from a branch other than `main`, use:

```bash
REQUIRED_GIT_BRANCH=studio-os-cms-production-20260425 npm run deploy:check
REQUIRED_GIT_BRANCH=studio-os-cms-production-20260425 npm run deploy:prod
```

---

## Safety rules

- Do **not** run `prisma migrate reset` on production.
- Do **not** run `prisma db push` against production.
- Do **not** delete migration folders.
- Do **not** commit `.env` files with production secrets.
- If `migrate deploy` fails, stop, read Prisma’s message, fix the migration or DB with your team’s process—do not force-push schema blindly.

---

## Related

- [`docs/deployment.md`](deployment.md) — Vercel vs migrations, Neon env overview.
- [`DEPLOY.md`](../DEPLOY.md) — Vercel env vars and Git integration.
- [`scripts/deploy-prod.sh`](../scripts/deploy-prod.sh) — Full gated deploy.
