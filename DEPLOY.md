# Deploy to Vercel

## Prerequisites

- GitHub repo connected to Vercel
- Neon (or other) PostgreSQL database
- Environment variables configured

## 1. Push to GitHub

```bash
cd brightline
git add .
git commit -m "Fix build: Next.js 16 params, contact Suspense, audit vulnerabilities"
git push origin main
```

Vercel will auto-deploy when you push to the main branch.

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

## Troubleshooting

- **Build fails**: Ensure `outputFileTracingRoot` or project root is correct if using monorepo
- **Database errors**: Check `DATABASE_URL` and run `prisma migrate deploy`
- **Contact form fails**: Verify Resend + Turnstile env vars
