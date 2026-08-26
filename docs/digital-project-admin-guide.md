# Digital project admin guide

1. Open `/admin/design`.
2. Use **Live / Hidden** master toggle carefully — Hidden keeps `/design` as 404.
3. Placement checkboxes: nav, homepage, work hub, about, footer (only apply when Live).
4. Create a project → edit at `/admin/design/[id]`.
5. Set categories, portfolio status, metadata, problem statement, brief/approach/outcome, and case-study sections.
6. Attach cover via MediaAsset id; add specimen image keys.
7. Leave **Published** unchecked until review.
8. Preview public URL only works when section is Live **and** project is Published.

Seed drafts (unpublished):

```bash
npx tsx scripts/seed-design-portfolio-drafts.ts
```

Résumé page settings are stored in SiteSetting `resume_page:v1` (enabled + optional download/LinkedIn/GitHub URLs). Enable via Prisma/admin settings when a real PDF and links exist.
