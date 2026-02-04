# Admin login

Admin sign-in uses **credentials only** (email + password). No email delivery required.

## Required env vars (Vercel)

In Vercel → Project → Settings → Environment Variables, set:

| Variable        | Example                     | Required |
|----------------|-----------------------------|----------|
| NEXTAUTH_URL   | https://brightlinephotography.co | Yes      |
| NEXTAUTH_SECRET| (random 32+ char string)    | Yes      |
| ADMIN_EMAIL    | kiril.mironyuk@gmail.com    | Yes      |
| ADMIN_PASSWORD | your-secure-password        | Yes      |

For multiple admins: `ADMIN_EMAILS=admin1@example.com,admin2@example.com`. All share the same `ADMIN_PASSWORD`.

## After setting env vars

1. Redeploy (Vercel → Deployments → ⋮ → Redeploy)
2. Go to https://your-site.com/admin/login
3. Sign in with your email and password
