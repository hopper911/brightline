# Design & Digital rollback plan

## Immediate public hide (no deploy)

1. Admin → Design → set section **Hidden** (`enabled: false`).
2. Optionally unpublish all DesignProjects.

Effect: `/design` and `/design/[slug]` return 404; Design nav/home/about/footer bands disappear; photography site unchanged.

## Resume hide

Set SiteSetting `resume_page:v1` → `{ "enabled": false }` (or omit). `/resume` returns 404.

## Code rollback

Redeploy previous Vercel deployment if a regression is code-related. Additive DB columns can remain; unused fields are harmless.

## Do not

- Drop `DesignProject` columns in emergency
- Force-push destructive migrations
- Change photography Work routes as part of Design rollback
