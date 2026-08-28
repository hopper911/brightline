# Publishing cutover runbook (Phase 6C)

**Consumer:** `PATCH /api/admin/blog-posts` → Mirotech journal sync  
**Flag:** `PLATFORM_PUBLISHING_ENABLED` (default **off**)  
**Audit (optional):** `PLATFORM_AUDIT_ENABLED` — records `publishing.*` when platform path runs

## Release plan

1. **Deploy with flag off** — production continues legacy `syncBlogPostsToMirotech` path.
2. **Smoke legacy** — save a blog post with `publishToMirotech`; confirm `mirotechSync` in JSON response.
3. **Enable in dev/staging** — set `PLATFORM_PUBLISHING_ENABLED=true`; repeat save; compare `mirotechSync` and Mirotech journal state.
4. **Enable production manually** — only after staging parity; do **not** enable via deploy defaults.
5. **Monitor** — admin blog saves, Mirotech ingest errors, Vercel function logs for `BLOG_MIROTECH_SYNC_ERROR`.
6. **Rollback** — unset `PLATFORM_PUBLISHING_ENABLED` or set `false`; redeploy not required if env-only.

## Rollback

```bash
# Vercel / local — remove or disable
PLATFORM_PUBLISHING_ENABLED=false
```

Legacy path resumes on next request; no data migration.

## Parity checklist (staging)

- [ ] `mirotechSync[].ok` matches pre-cutover behavior
- [ ] `mirotechJournalId` persisted on blog post after successful sync
- [ ] Unpublish (`publishToMirotech: false`) clears remote when configured
- [ ] Revalidation still runs (blog/travel/sitemap)
- [ ] No duplicate sync (legacy + platform) — verify single code path via logs

## Audit events (when both flags on)

| Action | When |
| --- | --- |
| `publishing.started` | Before each eligible post sync |
| `publishing.completed` | Adapter returns `completed` |
| `publishing.failed` | Failed result or thrown error |

Metadata includes `target: mirotech-site`, `resourceId` on success — no full post body.
