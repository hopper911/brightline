# Build notes

## Work pages and database at build time

**What changed:** Public Work routes (`/work`, `/work/[section]`, `/work/[section]/[projectSlug]`) and the homepage (`/`) no longer require database access during `next build`. This allows builds to succeed when `DATABASE_URL` is unset (e.g. in CI) or when the database is temporarily unreachable.

**How:**

- **Strategy:** Each of these pages exports `export const dynamic = "force-dynamic"`, so Next.js does not run them at static generation time. They are rendered at request time when a user visits the page.
- **Removed:** `generateStaticParams` from `/work/[section]` and `/work/[section]/[projectSlug]` so no Prisma calls run during the build phase.
- **Defensive handling:** Where Work data is fetched (homepage featured hero, work index pillar covers, section/pillar project lists, project detail), a try/catch wraps the Prisma call. If the database is down at runtime, the user sees a minimal fallback: “Work is updating” and “Please check back shortly.” instead of a 500 error.

**Verify:**

- Run `npm run build` with `DATABASE_URL` unset or invalid; the build should complete.
- Run `npm run dev` with a valid `DATABASE_URL`; Work and homepage should render normally.
- With DB down at runtime, visiting a Work page should show the fallback message, not a crash.
