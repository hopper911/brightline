# Deploy to Vercel

**CLI production deploys (migrations first, then Vercel):** use [`npm run deploy:prod`](docs/deployment.md) and read [docs/deployment.md](docs/deployment.md) for the full safe workflow, Neon `DATABASE_URL` / `DIRECT_URL`, and what to do if a migration fails.

## Prerequisites

- GitHub repo connected to Vercel
- Neon (or other) PostgreSQL database
- Environment variables configured

## 1. Push to GitHub

From the **app repo root** (the folder that contains `.git` — e.g. `brightline/brightline` if the repo is inside the outer brightline folder):

```bash
cd /path/to/brightline   # e.g. .../brightline/brightline
git add .
git commit -m "Brightline: lib/storage + image-strategy + env, lint fixes, admin Link"
git push origin main
```

If your git repo root is your **Desktop** (and this app lives under `brightline/brightline`), stage only the project and then push:

```bash
cd ~/Desktop
git add brightline/
git commit -m "Brightline: lib/storage + image-strategy + env, lint fixes, admin Link"
git push origin main   # or: git push origin work-v2 then merge to main on GitHub
```

Vercel will auto-deploy when you push to the branch it is configured to use (usually `main`).

## 2. Environment Variables (Vercel Dashboard)

Set these in **Vercel → Project → Settings → Environment Variables**:

### Required
- `DATABASE_URL` — Neon/PostgreSQL connection string
- `NEXTAUTH_SECRET` — Random string for session encryption
- `NEXTAUTH_URL` — Your production URL (e.g. `https://yoursite.vercel.app`)

### Email (Resend)
- `RESEND_API_KEY`
- `RESEND_FROM` — e.g. `Bright Line <no-reply@yourdomain.com>`
- `CONTACT_NOTIFY_EMAIL` — Where contact form submissions go

### Optional
- `NEXT_PUBLIC_SITE_URL` — Base URL for sitemap and robots (set to `https://brightlinephotography.com` in Production; see Canonical domain below)
- `SEED_TOKEN` — For POST /api/admin/seed (dev only; omit in production)
- `NEXT_PUBLIC_CALENDLY_URL` — For booking modal
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — Cloudflare Turnstile (contact form spam protection)
- `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` — Analytics
- `NEXT_PUBLIC_GA_ID` — Google Analytics

### AI (OpenAI + fal.ai video)
- `OPENAI_API_KEY` — Blog assist, alt text, showcase captions, motion prompts
- `OPENAI_MODEL` — Optional chat model override
- `OPENAI_VISION_MODEL` — Optional vision model override
- `FAL_KEY` — Required for **Blog → Video → Generate AI video** (image-to-video via fal.ai). Without it, generation returns 503.
- `FAL_IMAGE_TO_VIDEO_MODEL` — Optional; defaults to `fal-ai/kling-video/v3/standard/image-to-video` (~5s clips). Rate limits: 8 requests/hour/IP and 3 generations/hour/post.

### Canva Connect (blog cover + social designs)
- `CANVA_CLIENT_ID` — Public integration from [Canva Developer Portal](https://www.canva.com/developers/)
- `CANVA_CLIENT_SECRET` — Generated secret for the integration
- `CANVA_REDIRECT_URI` — Must match an authorized redirect, e.g. `https://brightlinephotography.com/api/admin/canva/oauth/callback` (add `http://127.0.0.1:3000/api/admin/canva/oauth/callback` for local)
- **Free plan:** Connect + create blank designs + export JPG works. Brand-template Autofill requires Enterprise (not used). Private integrations require Enterprise — use a **Public** integration (can remain unpublished for your own account). MFA must be enabled on the Canva account.
- Scopes to enable: `design:content:read`, `design:content:write`, `design:meta:read`, `asset:read`, `asset:write`, `profile:read`

### Media Kit (shared pack / batch / Work→Journal)
- Uses `OPENAI_API_KEY` for social captions and `FAL_KEY` for ~5s image-to-video inside **Generate media pack** / batch.
- Assets land under `site/media-kits/{blog|work}/{id}/…` on R2.
- Admin: Blog → Media kit + Distribution toggles; Work project → **Create journal draft**.
- Distribution flags (published post): `showInJournal` (/blog), `showInTravel` (/travel), `featureOnHome` (homepage strip), `featureInCaseStudies` (/case-studies).

### Travel blog (`format: "travel"`)
- Public: `/travel` index + `/travel/[slug]` (separate from Journal `/blog`).
- Same CMS store (`blog_posts:v1`) with `format: "journal" | "travel"` and nested `travel` fields (destination, dates, itinerary, tips, packing, map stops, season, camera kit, essentials).
- Interactive itinerary map: admin Travel details → map stops + **Lookup place** (Nominatim via `/api/admin/geocode`); public renders Leaflet dark map when stops have coordinates.
- New travel drafts: `showInJournal: false`, `showInTravel: true`, media-kit preset `travel`.
- Top nav is **not** changed — link `/travel` when you are ready.
- Canonical redirects: travel slug on `/blog/…` → `/travel/…` (and reverse for journal).
- Authoring extras (journal + travel): pull quote, key takeaways, photo credits; body **Polish** / **Fix** AI; admin **Preview** at `/admin/blog/preview/[id]`; Work project picker in Distribution.

### Storage (R2/S3 for client galleries and Work images)
R2 (Cloudflare):
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET` — e.g. `brightline-main`
- `R2_ENDPOINT` — e.g. `https://<account-id>.r2.cloudflarestorage.com`
- `R2_REGION` — Use `auto`
- `R2_PUBLIC_URL` — Public URL for serving images (e.g. `https://pub-xxx.r2.dev`)
- `NEXT_PUBLIC_R2_PUBLIC_URL` — Same as R2_PUBLIC_URL (needed for client-side image URLs)

Dual-bucket hub (`/admin/r2` → Vault **Mirotech site**). Separate Mirotech CMS bucket — do **not** repoint Brightline `R2_*`:
- `MIROTECH_R2_ACCESS_KEY_ID` / `MIROTECH_R2_SECRET_ACCESS_KEY` — token scoped to the Mirotech bucket
- `MIROTECH_R2_BUCKET` — must start with `mirotech` (e.g. `mirotech`)
- `MIROTECH_R2_ENDPOINT` — optional if same account as `R2_ENDPOINT`
- `MIROTECH_R2_REGION` — `auto`
- `MIROTECH_R2_PUBLIC_URL` / `NEXT_PUBLIC_MIROTECH_R2_PUBLIC_URL` — e.g. `https://media.mirotech.solutions`

S3 (AWS):
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `S3_REGION`
- `S3_ENDPOINT` — Optional (set only for S3-compatible providers)

## 3. Database Migration

Run migrations on your production database before or after first deploy:

```bash
npx prisma migrate deploy
```

Or use Neon's dashboard to run migrations.

## 4. Verify

After deploy:

1. Visit your Vercel URL
2. Test Work pages: `/work`, `/work/acd`, etc.
3. Test contact form (saves to Inquiry; optional Resend email)
4. Test Process page: `/process`
5. Check admin login (`/admin/login`)
6. Client portal (`/client`) if enabled

## Canonical domain

Production site URL: **`https://brightlinephotography.com`**.

- **Redirects** for alternate hosts (`www.brightlinephotography.com`, `brightlinephotography.co`, `www.brightlinephotography.co`) live in `vercel.json`. This repo has two copies so different Vercel **Root Directory** layouts stay covered:
  - **Repo root** deploy: [`vercel.json`](../../vercel.json) at the repository root (includes `outputDirectory` / `framework` when the monorepo builds the app from the parent folder).
  - **App-only deploy**: [`vercel.json`](./vercel.json) next to this Next.js app.
- Keep the **`redirects`** array identical in both files when you change host rules.
- Whichever `vercel.json` your Vercel project actually loads is determined by **Project → Settings → General → Root Directory**. Only that file’s redirects apply at runtime.

## Build Configuration

In Vercel Project Settings → General:
- **Root Directory**: Set to `brightline` if your repo root contains the brightline folder
- **Build Command**: `npm run build` (runs `prisma generate && next build --webpack`)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

## Troubleshooting

- **Build fails**: Ensure `outputFileTracingRoot` or project root is correct if using monorepo
- **Database errors**: Check `DATABASE_URL` and run `prisma migrate deploy`
- **Contact form fails**: Verify Resend + Turnstile env vars
