# BRIGHTLINE Photography

Next.js App Router site for [brightlinephotography.com](https://brightlinephotography.com): public portfolio, client galleries, delivery packages, admin/studio/accountant portals, R2 media, Prisma/Neon.

## Architecture (high level)

```text
Public (/work, /galleries, /services, /about, /contact, /journal)
        │
        ▼
Next.js App Router ── Prisma ── Neon Postgres
        │
        ├── Admin cookie session (/admin) + Studio OS (/studio)
        ├── Accountant JWT portal (/accountant)
        ├── Client gallery access codes → signed session cookie
        ├── Delivery packages (/package/[token]) + final-package tokens
        └── Cloudflare R2 (presigned upload/download, MIME allowlist)
```

**Authz boundaries (do not “simplify” into multi-tenant Org tables):**

| Surface | Gate |
| --- | --- |
| Admin / Studio | HMAC admin session cookie |
| Accountant | JWT + permission flags |
| Client gallery | Access code → signed `client_access_session` |
| Delivery package | Opaque URL token (+ optional `expiresAt`) |
| Public media | Allowlisted R2 key prefixes only |

Security locks live in `lib/truth/` (CSRF prefixes, upload MIME, nav brand). Prefer hardening those tests over schema rewrites.

## Environment

- Use `.env.example` as the checklist for Preview/Production parity on Vercel.
- Neon: pooled `DATABASE_URL` + unpooled `DIRECT_URL` for migrations.
- Optional: `SENTRY_DSN` (see `instrumentation.ts` / `lib/monitoring/sentry.ts`).

```bash
npm install
npx prisma generate
npm run db:migrate   # needs DIRECT_URL
npm run dev
```

## 5-minute delivery-package demo

One finished vertical: seed → open package → API authz rejects.

```bash
# 1) Empty-DB friendly seed (writes tmp/delivery-smoke.json)
npm run seed:delivery-smoke:empty

# 2) Start the app (another terminal)
npm run dev

# 3) Open the printed /package/<token> URL — or:
#    cat tmp/delivery-smoke.json

# 4) Authz smoke (Vitest — no browser)
npm test -- lib/authz/authz.test.ts

# 5) Playwright vertical (build + start, or reuse running server)
npm run build && PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:e2e
# with auto webServer after build:
npm run build && npm run test:e2e
```

Expect: valid token page loads; wrong/expired tokens 404; manifest OK for seed token; download of a foreign item id returns 404.

## Tests & CI

- `npm test` — Vitest (authz, truth locks, delivery IDOR, …)
- `npm run test:e2e` — Playwright package vertical
- GitHub Actions (`.github/workflows/ci.yml`): unit tests → build; e2e job with Postgres service + seed

## Case studies (legacy MDX note)

Older MDX under `content/projects` may still exist; live Work content is CMS/Studio Hub driven. Do not treat MDX as the production source of truth unless you are explicitly migrating it.

## Ops notes

- Neon PITR + branch-before-risky-migrate.
- Never overwrite Google Sheet formula cells (Brightline Image Uploads tab).
- Do not re-enable Lenis on `/admin`, `/studio`, `/accountant` (sidebar scroll lock).
