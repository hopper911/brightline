# Internal / automation API surface (Bright Line)

This documents **machine-facing** JSON endpoints used from n8n, local scripts, and Lightroom tooling. URLs stay stable; do **not** mass-rename to `/api/internal` without updating automation clients.

For human admin traffic, `/api/admin/*` and `/api/studio/*` are gated by [`proxy.ts`](../proxy.ts) + [`authorizeAdminRequest`](../lib/admin-auth.ts).

## Bearer + admin hybrid (Studio CMS / media pipeline)

Auth: [`requireProjectsApiAuth`](../lib/api/automation-auth.ts) — **admin session** or `Authorization: Bearer <AUTOMATION_API_SECRET>` or `<BL_INTERNAL_API_TOKEN>`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/projects` | List `StudioProject` rows; query `category`, `published`, `limit`, `offset`; response includes `hasMore` |
| GET / PATCH / DELETE | `/api/projects/[id]` | Project CRUD |
| GET | `/api/projects/by-slug/[slug]` | Resolve by slug |
| POST | `/api/projects/create` | Create project |
| POST | `/api/projects/publish` | Publish workflow |
| POST | `/api/projects/generate-from-brief` | AI brief |
| POST | `/api/projects/analyze-images` | Vision batch |
| POST | `/api/projects/generate-copy` | Copy generation |
| POST | `/api/media/upload` | Upload |
| POST | `/api/media/attach-existing` | Attach keys |

## Cron

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/cron/followups` | `Authorization: Bearer <CRON_SECRET>` (or allowed in non-production when unset — see route) |

## Optional future: `/api/internal/v1`

If you introduce a dedicated prefix, prefer **Next.js rewrites** to the handlers above or **new** thin route files that call shared `lib/` functions — avoid duplicating business logic.

## Related

- [STUDIO_OS_AUDIT_REFERENCE.md](./STUDIO_OS_AUDIT_REFERENCE.md) — token/cookie routes and IDOR review list.

## AI and logging

Prefer OpenAI usage via [`lib/ai/runtime.ts`](../lib/ai/runtime.ts) (`createOpenAiClient`, `runChatCompletion`) so provider errors map consistently. For API/automation diagnostics use [`lib/observability/log.ts`](../lib/observability/log.ts) (`apiLog`); **do not** log full prompts, raw bearer tokens, or access codes in production.
