# Production deployment (safe workflow)

This document describes how to deploy the Bright Line / Studio OS app to **Vercel production** without accidentally shipping uncommitted code or skipping **Prisma** database migrations.

## The one command (from the app root)

The folder that contains `package.json` and `prisma/` (this repo’s Next.js app root):

```bash
cd /path/to/brightline   # directory with package.json

export DATABASE_URL="…"   # production database (see Neon below)
export DIRECT_URL="…"    # required by prisma/schema.prisma (direct connection)

# Optional: if production is not `main`
# export REQUIRED_GIT_BRANCH=your-branch

npm run deploy:prod
```

You will be asked to type **`DEPLOY`** exactly to continue.

---

## What `vercel deploy --prod` does

The Vercel CLI uploads **files from your local disk** in the project directory and starts a production deployment. It uses whatever is on disk at that moment.

- A **clean Git tree** (no modified, staged, or untracked files) means what you deploy matches a known commit.
- If you deploy with **uncommitted changes**, you can put code into production that **never appears in Git**—hard to reproduce, review, or roll back.

The **Vercel build** runs `npm run build`, which includes **`prisma generate`** (regenerates the Prisma Client). It does **not** apply migrations to your production database.

---

## What `prisma migrate deploy` does

`npx prisma migrate deploy`:

- Reads migration folders under `prisma/migrations`.
- Applies **only pending** migrations to the database pointed to by **`DATABASE_URL`** / **`DIRECT_URL`** (see your `schema.prisma`).
- Does **not** change your local `schema.prisma` or create new migration files.

It is the **correct** command for production. Do **not** use `prisma migrate dev` or `prisma db push` against production (those are for development workflows and can be destructive or drift-prone).

---

## Why migrations and Vercel deploy are separate

- **Migrations** change the **Neon Postgres** schema and data (DDL/SQL you’ve committed in `prisma/migrations`).
- **Vercel** builds and runs the **application** with env vars configured in the Vercel project.

Running migrations **before** `vercel deploy --prod` avoids a window where new app code expects a schema that the database does not have yet (or the reverse).

`npm run deploy:prod` runs **migrate deploy**, then **`vercel deploy --prod`**, in that order.

---

## Neon Postgres: `DATABASE_URL` and `DIRECT_URL`

This project’s Prisma datasource uses both:

- `url = env("DATABASE_URL")`
- `directUrl = env("DIRECT_URL")`

For Neon, you typically use:

- A **pooled** connection string for runtime (often what you set as `DATABASE_URL` in Vercel for the app).
- A **direct** (non-pooled) connection string for `DIRECT_URL`, which Prisma uses for migrations and some introspection.

**Do not commit real URLs or passwords.** Use the Neon dashboard or Vercel’s environment UI to copy values. For local runs of `npm run deploy:prod`, you can:

- Export the vars in your shell before running, or
- Use `vercel env pull .env.production.local` (creates a **gitignored** file) and then `source` the file in your shell *in a way you’re comfortable with* (only on a trusted machine).

Never paste production secrets into tickets, chat, or Git.

---

## What the deploy script checks

`scripts/deploy-prod.sh` (via `npm run deploy:prod`):

1. You are inside a Git repository.
2. **Working tree is clean** (including no untracked files).
3. Current branch matches **`main`**, or **`REQUIRED_GIT_BRANCH`** if you set it.
4. **`DATABASE_URL`** and **`DIRECT_URL`** are set in the environment.
5. After you type **`DEPLOY`**: runs `npx prisma migrate deploy`, then `vercel deploy --prod`.

If any check fails, the script exits and does not deploy.

---

## If a migration fails

1. **Stop.** Do not run `vercel deploy --prod` until you understand the failure.
2. Read the Prisma error output (duplicate column, lock, permission, etc.).
3. Fix the migration or the database with your **team’s process** (never `db push` / `migrate dev` on production casually).
4. Re-run **`npm run deploy:prod`** only after the migration issue is resolved.

If migrations **succeeded** but **Vercel deploy** failed, your production database may already be ahead of the last successful deploy. Fix the Vercel issue, then deploy again; avoid re-applying the same migration manually unless you know it’s safe.

---

## What not to do in production

- `prisma db push`
- `prisma migrate dev` (against prod DB)
- Resetting or dropping production data without a documented backup/recovery plan
- `vercel deploy --prod` with a **dirty** Git tree (bypasses the script if you run Vercel directly—use `npm run deploy:prod` instead)

---

## Prerequisites

- **Node.js** and **npm** (see `package.json` `engines`).
- **Git** with a clean tree on the allowed branch.
- **Vercel CLI** installed and logged in (`vercel login`) for the team/project you deploy to.
- Production **DATABASE_URL** and **DIRECT_URL** available in your environment for the migrate step.

---

## Related

- **Step-by-step production checklist** (what happened with `vercel deploy --prod`, how to run migrations safely): [production-deploy-checklist.md](production-deploy-checklist.md).
- Broader Vercel + env setup: [DEPLOY.md](../DEPLOY.md) at the app root.
- GitHub Actions may also run `prisma migrate deploy` on push to `main`; this CLI workflow is for **manual** production deploys with the same safety gates.
