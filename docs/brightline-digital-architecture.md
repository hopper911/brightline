# Brightline Design & Digital — Architecture

## Route map

| Route | Gate | Purpose |
| --- | --- | --- |
| `/design` | `design_section.enabled` | Design & Digital hub |
| `/design/[slug]` | enabled + `published` | Case study |
| `/resume` | `resume_page:v1.enabled` | Recruiter résumé |
| `/admin/design` | Admin cookie | CMS list + section flags |
| `/admin/design/[id]` | Admin cookie | Project editor |

Photography routes (`/work`, galleries, client) unchanged.

## Data model

`DesignProject` (Prisma) extended with `DesignPortfolioStatus`, metadata labels, `caseStudy` JSON, `problemStatement`, `ogImageKey`, `publishedAt`.

Covers reuse `MediaAsset`. Specimens remain in `specimenBlocks` JSON.

## Publishing flow

1. Create/edit in `/admin/design`
2. Keep `published: false` until content + media ready
3. Section master toggle `enabled` still required for public routes
4. Sitemap includes design only when enabled + published

## Media flow

R2 keys via existing admin media / cover MediaAsset id. Public URLs via `getPublicR2Url`. TODO lines in case-study text scrubbed before public render.

## Feature flags

| Flag | Source |
| --- | --- |
| `designPortfolioEnabled` | `design_section:v1.enabled` |
| `designNavEnabled` | enabled && showInNav |
| `homepageDigitalSectionEnabled` | enabled && showOnHome |
| `resumePageEnabled` | `resume_page:v1.enabled` |
| `employmentInquiryEnabled` | always true (contact form) |

## Admin / public rendering

Admin APIs: `/api/admin/design-section`, `/api/admin/design-projects`.  
Public queries: `lib/queries/design.ts` — empty when section disabled.

## SEO

Per-project metadata + CreativeWork JSON-LD on case studies. Drafts unpublished → not in sitemap; `/resume` noindex when disabled.

## Contact inquiry flow

`ContactPageClient` → `POST /api/contact` → `Inquiry` + Resend subject `[BRIGHTLINE] {type} inquiry from {name}`. Employment hides budget field.
