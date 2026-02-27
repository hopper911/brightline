# Deploy to Vercel

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
- `NEXT_PUBLIC_SITE_URL` — Base URL for sitemap (default: https://brightlinephotography.co)
- `SEED_TOKEN` — For POST /api/admin/seed (dev only; omit in production)
- `NEXT_PUBLIC_CALENDLY_URL` — For booking modal
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — Cloudflare Turnstile (contact form spam protection)
- `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` — Analytics
- `NEXT_PUBLIC_GA_ID` — Google Analytics

### Storage (R2/S3 for client galleries and Work images)
R2 (Cloudflare):
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET` — e.g. `brightline-main`
- `R2_ENDPOINT` — e.g. `https://<account-id>.r2.cloudflarestorage.com`
- `R2_REGION` — Use `auto`
- `R2_PUBLIC_URL` — Public URL for serving images (e.g. `https://pub-xxx.r2.dev`)
- `NEXT_PUBLIC_R2_PUBLIC_URL` — Same as R2_PUBLIC_URL (needed for client-side image URLs)
- `NEXT_PUBLIC_MEDIA_URL` — Base URL for hero video (e.g. `https://media.brightlinephotography.co`)
- `NEXT_PUBLIC_HERO_VIDEO_KEY` — Hero video key (e.g. `videos/hero/intro-v1`); change to swap weekly

S3 (AWS):
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_BUCKET`
- `S3_REGION`
- `S3_ENDPOINT` — Optional (set only for S3-compatible providers)

### Sentry (error tracking)
- `SENTRY_DSN`
- `SENTRY_AUTH_TOKEN` — For source maps

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

## Build Configuration

In Vercel Project Settings → General:
- **Root Directory**: Set to `brightline` if your repo root contains the brightline folder
- **Build Command**: `npm run build` (runs `prisma generate && next build --webpack`)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

## Hero Video (R2)

For full-bleed hero video, upload to R2:

- `videos/hero/intro-v1.mp4` (required)
- `videos/hero/intro-v1.webm` (optional)
- `videos/hero/intro-v1.poster.jpg` (for instant paint)

**Content-Type:** R2 usually auto-detects; ensure `.mp4` → `video/mp4`, `.jpg` → `image/jpeg`.

**CORS:** If video fails to load, allow `GET`/`HEAD` from your domain in the R2 bucket CORS config.

## Troubleshooting

- **Build fails**: Ensure `outputFileTracingRoot` or project root is correct if using monorepo
- **Database errors**: Check `DATABASE_URL` and run `prisma migrate deploy`
- **Contact form fails**: Verify Resend + Turnstile env vars
