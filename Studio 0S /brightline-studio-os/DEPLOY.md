# Vercel deployment

## Quick setup

1. **Import the repo** in [Vercel](https://vercel.com) and connect your Git provider.

2. **Root directory**  
   If the repo root is not the app folder, set:
   - Root Directory: `Studio 0S /brightline-studio-os` (or the path to this folder)

3. **Build command**  
   The default uses the `build` script: `prisma generate && next build`

4. **Environment variables**  
   - Optional for build: a placeholder `DATABASE_URL` is in `vercel.json` so Prisma can run `generate`.
   - For a working database: add `DATABASE_URL` in Project Settings → Environment Variables (e.g. Neon, Supabase Postgres).

5. **Deploy**  
   Push to the connected branch (e.g. `visual-prototype`); Vercel deploys automatically.

## Notes

- Without a real `DATABASE_URL`, CRM and Projects API routes will show "Database not configured".
- To enable them, add a Postgres URL (e.g. Neon) and redeploy.
