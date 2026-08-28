# Internal / automation API surface (Bright Line)

This documents **machine-facing** JSON endpoints used from n8n, local scripts, and Lightroom tooling. URLs stay stable; do **not** mass-rename to `/api/internal` without updating automation clients.

For human admin traffic, `/api/admin/*` and `/api/studio/*` are gated by [`proxy.ts`](../proxy.ts) + [`authorizeAdminRequest`](../lib/admin-auth.ts). Some studio routes also accept automation bearer tokens via [`requireProjectsApiAuth`](../lib/api/automation-auth.ts) (see table below).

## Studio Mission Control (tasks, calendar, notifications)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/studio/schedule` | Admin session | List `StudioScheduleEvent` in `from` / `to` range |
| POST | `/api/studio/schedule` | Admin session | Create event |
| PATCH / DELETE | `/api/studio/schedule/[id]` | Admin session | Update / delete |
| GET | `/api/studio/tasks` | Admin session | List tasks; optional `projectId`, `status` |
| POST | `/api/studio/tasks` | Admin session | Create task |
| PATCH / DELETE | `/api/studio/tasks/[id]` | Admin session | Update / delete |
| GET | `/api/studio/notifications` | Admin session | List notifications; `unreadOnly`, `limit` |
| POST | `/api/studio/notifications/digest` | Admin session | Regenerate unread digest rows from due tasks + upcoming events |
| PATCH | `/api/studio/notifications/[id]` | Admin session | `{ "read": true \| false }` |
| POST | `/api/studio/automation/events` | Admin session **or** automation bearer | Accepts structured events for logging / future hooks (see payload below) |

### `POST /api/studio/automation/events`

Auth: [`requireProjectsApiAuth`](../lib/api/automation-auth.ts) — same bearer tokens as Studio CMS (`AUTOMATION_API_SECRET` / `BL_INTERNAL_API_TOKEN`).

Request body (JSON):

```json
{
  "event": "studio.project.status_changed",
  "idempotencyKey": "optional-string",
  "occurredAt": "2026-05-09T12:00:00.000Z",
  "entity": { "type": "project", "id": "clxxx" },
  "payload": {}
}
```

Response: `{ "ok": true, "received": true, "event": "..." }`. Today this **records a structured log line** only; persist to your own store or extend with durable idempotency when you add automation consumers.

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
| GET | `/api/cron/platform-jobs` | `Authorization: Bearer <CRON_SECRET>` — drains pending platform jobs (flag-gated) |

## Optional future: `/api/internal/v1`

If you introduce a dedicated prefix, prefer **Next.js rewrites** to the handlers above or **new** thin route files that call shared `lib/` functions — avoid duplicating business logic.

## Related

- [STUDIO_OS_AUDIT_REFERENCE.md](./STUDIO_OS_AUDIT_REFERENCE.md) — token/cookie routes and IDOR review list.

## AI and logging

Prefer OpenAI usage via [`lib/ai/runtime.ts`](../lib/ai/runtime.ts) (`createOpenAiClient`, `runChatCompletion`) so provider errors map consistently. For API/automation diagnostics use [`lib/observability/log.ts`](../lib/observability/log.ts) (`apiLog`); **do not** log full prompts, raw bearer tokens, or access codes in production.
