# ACCESSIBILITY REPORT — PHASE 16

**Date:** 2026-08-29  
**Branch:** `architecture/platform-foundation`  
**Target:** WCAG 2.2 AA where practical — substantial failures and critical interaction gaps only.

---

## 1. Major issues found

| Area | Issue | Severity | Status |
| --- | --- | --- | --- |
| Modals / dialogs | No focus trap or focus restore on public/admin overlays (booking, client lightbox, mobile nav, most admin modals) | **Critical** | **Partial fix** (see §2–3) |
| Mobile navigation | Overlay not in dialog pattern; background remained tabbable | **High** | **Fixed** |
| Client gallery | Grid actions visible only on hover; lightbox `role="presentation"` | **High** | **Fixed** |
| Client delivery chrome | `/client/*` used full public Navbar + Footer | **High** | **Fixed** |
| Reduced motion | Lenis smooth scroll ignored `prefers-reduced-motion`; HomeHero autoplay video + scroll scale | **High** | **Fixed** |
| Client access form | Access code field without label; errors not announced | **High** | **Fixed** |
| Admin shell | No skip link to main content | **Medium** | **Fixed** |
| Navbar auto-hide | Header translated off-screen on scroll down (hard to discover) | **Medium** | **Mitigated** (`focus-within:translate-y-0`) |
| Portfolio alt text | Runtime fallbacks to gallery/project title when per-image alt missing | **Medium** | **Open** (CMS supports alt; content workflow) |
| Before/after slider | Pointer-only drag; no keyboard adjustment | **Medium** | **Open** |
| Admin modals (R2, crop, gallery edit) | `role="dialog"` on some; none had focus trap | **High** | **Open** (utility added; not wired everywhere) |
| Mirotech public site | Separate Vercel deploy — not audited in this pass | — | **Out of scope** (this repo) |
| Automated a11y CI | No axe / Playwright a11y scans in pipeline | **Medium** | **Open** |

**Already strong:** skip link + global `:focus-visible` (`globals.css`), `ImageCarousel` keyboard + ARIA, `WorkProjectGallery` lightbox alts, `ContactPageClient` labeled required fields + `aria-live`, `LoginForm` error association, `PublicInlineVideo` + `SiteBackground` reduced-motion guards.

---

## 2. Public site fixes (this phase)

| Change | File(s) |
| --- | --- |
| Mobile nav: `role="dialog"`, `aria-modal`, `aria-controls`, focus trap, Escape, backdrop as labeled button | `components/Navbar.tsx` |
| Navbar stays visible when focused (`focus-within:translate-y-0`) | `components/Navbar.tsx` |
| Client access: labeled input, `role="alert` on errors, `aria-busy` on submit | `components/ClientAccessForm.tsx` |
| Client gallery: dialog lightbox + focus trap; grid controls visible on `focus-within` | `app/client/access/[token]/view.tsx` |
| Private delivery routes: minimal chrome (no marketing nav/footer) | `app/AppShell.tsx` |
| Booking modal: dialog semantics + focus trap | `components/BookingModal.tsx` |
| Home hero: skip autoplay video + scroll scale when `useReducedMotion()` | `components/HomeHero.tsx` |
| Lenis: do not initialize when `prefers-reduced-motion: reduce` | `app/providers.tsx` |

**Not changed (intentional):** public nav brand/copy, visual design, marketing motion on non-hero elements (global CSS still dampens animations under reduced motion).

---

## 3. Admin / Studio fixes

| Change | File(s) |
| --- | --- |
| Skip link → `#admin-main-content` | `app/admin/(dashboard)/layout.tsx` |
| Shared focus-trap utilities for future admin modals | `lib/a11y/focus-trap.ts`, `lib/a11y/use-focus-trap.ts` |

**Still needed (documented, not cosmetic):**

- Wire `useFocusTrap` into `R2BrowserModal`, `ImageCropModal`, admin gallery edit overlay (`galleries/page.tsx`)
- Studio layout skip link (mirror admin pattern)
- Consistent `outline-none` on custom admin inputs — rely on `:focus-visible` or explicit ring utilities

---

## 4. Keyboard behavior

| Journey | Before | After |
| --- | --- | --- |
| Mobile menu | Tab could reach page behind overlay; Escape only | Trap + restore focus; labeled backdrop |
| Client gallery lightbox | Escape closed; tab escaped overlay | Trap + `role="dialog"` |
| Booking modal | No trap | Trap + Escape |
| Client grid actions | In tab order but invisible until hover | Visible on card `focus-within` |
| Image carousel | Arrow/Home/End keys (existing) | Unchanged — good |
| Admin R2 browser | Tab behind modal possible | **Still open** |
| Before/after comparison | Mouse/touch only | **Still open** |

Global `:focus-visible` outline (white, 2px offset) remains the baseline for native controls.

---

## 5. Media accessibility

| Pattern | Assessment |
| --- | --- |
| `WorkCard` | Required `alt` prop — good |
| Work / project galleries | Per-image alt from CMS; fallback `projectTitle` is generic | Encourage descriptive alts in CMS |
| Client gallery grid | `image.alt \|\| gallery.title` | Same — studio should set alts on delivery |
| Hero / background video | Decorative layers `aria-hidden`; reduced motion disables autoplay (hero + site background) | Good |
| Decorative blurs / floats | No alt (decorative) | Good |
| Video embeds | Click-to-play + iframe `title` | Good |

**Recommendation:** treat missing image alt in client delivery as a **publishing QA** step (warn in admin when alt empty on delivery assets).

---

## 6. Form accessibility

| Form | Labels | Errors | Required | Submit state |
| --- | --- | --- | --- | --- |
| Contact (main fields) | `htmlFor` + `aria-describedby` | `aria-live` status region | Clear | Good |
| Contact (optional `<details>`) | Placeholder-only fields | — | **Weak** | Open |
| Client access | **Fixed** — `sr-only` label + `role="alert"` | **Fixed** | `required` + `aria-required` | `aria-busy` |
| Admin login | `aria-invalid`, `role="alert"` | Good | Good | Good |
| Studio / admin CMS forms | Mixed — many fields labeled; some icon-only controls | Inconsistent | Manual QA needed |

Errors on client access and contact success path are not color-only (text + live regions).

---

## 7. Automated checks

| Tool | Result |
| --- | --- |
| `eslint-config-next` (jsx-a11y via Next) | Available; not run as dedicated gate in CI |
| Vitest | **+2 tests:** `lib/a11y/focus-trap.test.ts`, `lib/a11y/prefers-reduced-motion.test.ts` |
| Lighthouse | Performance-only script (`perf:lighthouse`) — not a11y category |
| axe / Playwright a11y | **Not installed** |
| Manual keyboard pass | Mobile nav, client gallery, booking modal — improved; admin modals pending |

**Suggested follow-up:** add `@axe-core/playwright` on 3–5 critical routes (`/`, `/work`, `/galleries`, client gallery e2e with fixture token) — not added in this phase to avoid new CI dependency without review.

---

## 8. Remaining limitations

1. **Admin / Studio modals** — focus trap utility exists but R2 browser, crop modal, and gallery editor overlays still need wiring.
2. **Before/after slider** — needs keyboard-operable range or stepped controls (`components/BeforeAfterSlider.tsx`).
3. **Portfolio alt quality** — technical association exists; content often falls back to titles.
4. **Contact optional fields** — fields inside `<details>` lack explicit labels.
5. **Mirotech.solutions** — separate deploy; keyboard/dialog patterns not reviewed here.
6. **Color contrast** — brand white/60–70 on charcoal generally acceptable for large UI text; small uppercase nav at `text-white/70` should be spot-checked with contrast analyzer on live pages (no systematic failure flagged in code review).
7. **High zoom (200%+)** — responsive layouts use fluid typography; no dedicated audit; admin data tables may overflow horizontally.
8. **Screen reader live regions** — client gallery bulk actions (ZIP download errors) use text but not always `aria-live`.
9. **HTML edge cache + CSP nonce** — layout `headers()` forces dynamic shell; does not block a11y but affects performance of assistive-tech users on slow links.

---

## New shared utilities

```
lib/a11y/focus-trap.ts       — focusable query + Tab wrap
lib/a11y/use-focus-trap.ts   — hook: trap, Escape, restore focus
lib/a11y/prefers-reduced-motion.ts
```

Use `useFocusTrap(active, ref, { onEscape, restoreFocus })` for any new modal.

---

## Regression

- `npm test` — 530 passed (includes new a11y unit tests)
- No changes to `lib/truth/*`, Google Sheet formulas, or admin sidebar scroll lock

---

**STOP** — Phase 16 accessibility audit and high-impact fixes complete. Remaining items are documented for a focused Phase 16B or incremental admin modal pass.

---

## Phase 16B follow-up (2026-08-29)

| Item | Status |
| --- | --- |
| Admin R2 browser modal focus trap | **Fixed** — `R2BrowserModal.tsx` |
| Image crop modal focus trap + dialog semantics | **Fixed** — `ImageCropModal.tsx` |
| Galleries list edit modal focus trap | **Fixed** — `galleries/page.tsx` |
| Before/after slider keyboard | **Fixed** — visible range + arrow/Home/End on focusable group |
| Contact optional `<details>` labels | **Fixed** — `ContactPageClient.tsx` |
| Gallery delivery alt QA | **Fixed** — per-image alt fields, API `alts` PATCH, token confirm if missing |
| Portfolio alt workflow | **Improved** — work editor checklist (existing) + gallery delivery QA |
| Mirotech public site | **Out of scope** — separate Vercel project; mirror focus-trap + ISR patterns on Mirotech deploy |

