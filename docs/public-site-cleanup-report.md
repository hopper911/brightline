# Public site cleanup report (Stage 2)

**Date:** 2026-08-03  
**Scope:** Live-facing photography / marketing surfaces before Design launch.  
**Rule:** Fix Critical + High only if still present; do not redesign.

---

## Critical

| Finding | Status |
| --- | --- |
| Public placeholder captions (“Update this caption”, “R2 media”, etc.) | **Mitigated** — `isPublicPlaceholderCopy` in `WebsitePageView` |
| Inflated “500+ Projects” claim | **Mitigated** — `sanitizePublicStatItem` drops / replaces; credibility stats aligned |
| Core nav SHOW toggles not persisting | **Mitigated** — `assertCorePublicNavPreserved` no longer forces `visible: true` |
| Accidental Design public exposure | **OK** — `design_section.enabled` defaults false; routes `notFound()` |

No open Critical blockers for Design foundation work.

---

## High priority

| Finding | Status |
| --- | --- |
| About / Services duplicated body copy | **Mitigated** — `hideBody` / package section filtering |
| Corporate work pillar 404 | **Mitigated** — pillar restored in CMS; `/work/corporate` expected 200 |
| “Select Case studies” vanity stat | **Mitigated** — stripped from hero strip + public stats sanitize |
| Contact form photography-only | **Mitigated** — inquiry types include digital + employment |
| Broken internal Design links while section off | **OK** — hub/detail return 404 when disabled (intentional) |

No additional High fixes required in this pass beyond verification notes below.

---

## Medium priority

| Finding | Notes |
| --- | --- |
| Empty `BRAND.social.linkedin` / Instagram | Resume/About CTAs must hide until configured |
| No résumé PDF / `/resume` | Planned Stage 7 behind flag |
| Design hub copy still “Specimens from the studio” | Stage 4 rewrite (gated) |
| Schema.prisma drift vs accountant/contracts migrations | Track separately; don’t block Design additive migration |
| `typescript.ignoreBuildErrors: true` | Pre-existing; out of Stage 2 scope |
| Dual Work/Studio public slug surfaces in sitemap | Pre-existing; leave alone |

---

## Low priority

| Finding | Notes |
| --- | --- |
| Lint noise (scripts / ffmpeg wasm) | Exclude from future eslint scope |
| Failing vitest: admin-session, contracts-forms | Env/schema dependent; not Design blockers |
| Turnstile documented but unwired | Honeypot + rate limit remain |
| Legacy `/portfolio` routes | Leave; not part of Design expansion |

---

## Stage 2 actions taken

- Documented findings; **no production-facing structural edits** required beyond prior mitigations.
- Proceed to Stage 3 foundation with Design flags remaining off.

## Verification checklist (manual / prod)

- [ ] `/` loads; photography primary
- [ ] `/work` and pillar pages 200
- [ ] `/about` has no “Select Case studies”
- [ ] `/contact` inquiry types present
- [ ] `/design` returns 404 while section disabled
- [ ] Admin → Design settings shows Live toggle off by default in prod
