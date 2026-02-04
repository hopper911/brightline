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
- `NEXT_PUBLIC_CALENDLY_URL` — For booking modal
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — Cloudflare Turnstile (contact form spam protection)
- `TURNSTILE_SECRET_KEY`
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` — Analytics
- `NEXT_PUBLIC_GA_ID` — Google Analytics

### Storage (R2/S3 for client galleries)
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL` — Base URL for bucket (e.g. `https://xxx.r2.cloudflarestorage.com/bucket`)

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
2. Test contact form
3. Test client portal (`/client`)
4. Check admin login (`/admin/login`)

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
