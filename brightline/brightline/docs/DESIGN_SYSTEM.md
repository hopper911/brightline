# Bright Line Photography — Design System (Unified)

Single reference for all UI elements, cards, patterns, motion, and media delivery (Cloudflare R2). Use with Pencil or any design tool.

---

## 1. Design Tokens

### Colors

| Token | Hex / RGBA | Usage |
|-------|------------|-------|
| `--bg-ink-950` | #07090b | Page background (darkest) |
| `--bg-ink-900` | #0b0e12 | Muted background |
| `--bg-ink-850` | #0f1319 | Surface |
| `--bg-ink-800` | #141a22 | Alt surface |
| `--ink` | rgba(255,255,255,0.92) | Primary text |
| `--ink-soft` | rgba(255,255,255,0.7) | Muted text |
| `--ink-mute` | rgba(255,255,255,0.55) | Subtle text |
| `--line` | rgba(255,255,255,0.1) | Border |
| `--stroke` | rgba(255,255,255,0.12) | Strong border |
| `--card` | rgba(20,26,34,0.9) | Card background |
| `--color-accent` | #ffffff | Accent (buttons, links) |
| `--color-accent-ink` | #0b0e12 | Text on accent |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `--font-body` | Inter | Body text |
| `--font-display` | Montserrat | Headings |
| `--step-0` | 0.8–0.9rem | Small body |
| `--step-1` | 0.9–1rem | Body |
| `--step-2` | 1.1–1.35rem | Large body |
| `--step-3` | 1.35–1.75rem | H3 |
| `--step-4` | 1.6–2.25rem | H2 |
| `--ls-body` | -0.01em | Body letter-spacing |
| `--ls-display` | 0.01em | Display letter-spacing |
| `--ls-caps` | 0.32em | Uppercase labels |

### Spacing

| Token | Value |
|-------|-------|
| `--space-1` | 0.25rem (4px) |
| `--space-2` | 0.5rem (8px) |
| `--space-3` | 0.75rem (12px) |
| `--space-4` | 1rem (16px) |
| `--space-5` | 1.5rem (24px) |
| `--space-6` | 2rem (32px) |
| `--space-7` | 3rem (48px) |
| `--space-8` | 4rem (64px) |

### Motion

| Token | Value | Usage |
|-------|-------|-------|
| `--motion-fast` | 140ms | Hover micro-interactions |
| `--motion-med` | 260ms | UI state changes / header shrink |
| `--motion-slow` | 500ms | Scroll reveals (sections) |

**Motion principles:**

- Motion = restraint. Only opacity + transform (GPU friendly).
- No layout shifts (avoid animating height/width on major layout containers).
- Prefer one animation per section, not per element.
- Always support `prefers-reduced-motion: reduce`.

### Border Radius

| Use | Value |
|-----|-------|
| Cards, panels | 1rem (16px) |
| Buttons | 999px (pill) |
| Large blocks, callouts | 28px, 32px |
| Small inputs | 0.5rem (8px) |
| Service/FAQ cards | 16px, 24px |

---

## 2. Typography Styles

### Section Kicker (Label)

- Font: Montserrat / display
- Size: 0.65–0.7rem
- Uppercase, tracking: 0.22–0.35em
- Color: `--ink-mute`

### Section Title (H1)

- Font: Montserrat
- Size: clamp(1.875rem, 4vw, 3rem)
- Weight: 600
- Letter-spacing: -0.025em
- Line-height: 1.1

### Section Title Large (H2)

- Font: Montserrat
- Size: clamp(1.25rem, 2vw, 1.5rem)
- Weight: 600

### Section Subtitle

- Size: clamp(0.875rem, 1.2vw, 1.125rem)
- Line-height: 1.7
- Color: muted (`--ink-soft`)

### Card Tag / Meta

- Size: 0.6–0.65rem
- Uppercase, tracking: 0.28em
- Color: subtle (`--ink-mute`)

---

## 3. Buttons

### Primary (`btn btn-primary`)

- Background: `--color-accent` (white)
- Color: `--color-accent-ink`
- Padding: 0.8rem 1.6rem
- Radius: pill
- Font: 0.65rem uppercase tracking 0.32em
- Hover: translateY(-1px) + slight opacity change

### Ghost (`btn btn-ghost`)

- Border: `--stroke`
- Color: muted
- Same padding, radius, font as primary

### Outline Light (`btn btn-outline-light`)

- Border: `--stroke`
- Color: muted
- For dark CTA blocks

### Solid (`btn btn-solid`)

- Same as primary

---

## 4. Cards

### Work Card (Project Card)

- **Layout:** Image top, content bottom
- **Image:** Aspect 4:3, rounded top corners, object-cover
- **Border:** `--line` or `--stroke`
- **Background:** `--card` or `bg-black/40`
- **Radius:** 16px or 24px
- **Content padding:** p-5
- **Hover (current):** translateY(-1px), border lightens, image scale 1.03
- **Deferred:** Overlay fade, arrow nudge — WorkCard has no arrow; current hover is sufficient

### Pillar Section Card (Work Index)

- Same as Work Card, image height ~200px
- Pillar label as tag
- "View projects →" as meta

### Project Grid Card (Section Page)

- Image height: 240px
- Title + summary (line-clamp-2) + location/year
- If video: play icon overlay + "Video" meta tag

### Service Package Card

- Border: black/10
- Background: white
- Radius: 24px
- Padding: 1.5rem
- Title, summary, pricing, deliverables
- "View details →" link with arrow

### Outcome Card (About)

- Border: black/10
- Background: white
- Radius: 16px
- Padding: 1.25rem
- Title medium, body muted

### Testimonial Card

- Border: black/10
- Background: white/80
- Radius: 24px
- Padding: 1.5rem
- Quote: display xl, attribution: xs uppercase

### FAQ Card (Details)

- Radius: 16px
- Border: black/10 or white/10
- Padding: 1.25rem
- Summary: cursor-pointer, + icon rotates on open

### Credibility Stats Container

- Radius: 24px
- Border: black/10 or white/10
- Background: black/5
- Padding: 1.5–2rem
- Grid: 2 cols mobile, 4 cols desktop
- Stat value: display 2xl–3xl
- Stat label: xs uppercase
- **Deferred:** Count-up animation — adds motion; skip unless requested

### CTA Block (Dark)

- Radius: 28–32px
- Border: white/10
- Background: black
- Padding: 2–3rem
- Kicker, title, subtitle, button row

### Callout / Panel

- Radius: 28px
- Border: `--line`
- Background: `--bg`
- Padding: 2rem (2.5–3rem md)

---

## 5. Form Elements

### Input (Contact)

- Border: white/20
- Background: black/60
- Radius: 8px
- Padding: 0.75rem 1rem
- Focus: border white/40, ring white/30

### Label

- xs uppercase tracking-widest
- opacity ~70

### Submit Button (Contact)

- Border: white/25
- Padding: 0.75rem 1.5rem
- Uppercase tracking-widest
- Hover: border white/50

### Client Access Input

- Border: black/20
- Background: white/70
- Radius: pill
- Padding: 0.75rem 1.5rem

---

## 6. Navbar

### Base

- Sticky, z-50
- Border-bottom: white/10
- Background: #0b0e12/60 at top, #0b0e12/80 when scrolled
- Backdrop blur when scrolled

### Behavior

- Hides on scroll-down (translateY(-100%))
- Nav links: 0.7rem uppercase tracking 0.32em
- **Current:** py-4 constant; bg 60% at top, 80% when scrolled
- **Deferred:** Smart shrink (py-5→py-3) — causes layout shift; skip per audit

### Mobile

- Hamburger → slide-down panel
- Overlay fade-in
- Fast durations (200–260ms)

---

## 7. Footer

- Border-top: white/10
- Padding: 2.5rem
- Max-w: 6xl
- Layout: flex justify-between md+
- CTA buttons: Start a Project, Client Access
- Font: 0.65rem uppercase tracking 0.3em

---

## 8. Section Layouts

### Section Pad

- py-16 (base), py-20–24 (md/lg)

### Max Width

- 6xl (72rem / 1152px)
- px-6 (base), px-10 (lg)

### Grids

- Card grid: gap-5, 2 cols md, 3 cols lg
- Services: gap-6, md:3
- Two-column: md:grid-cols-[1.1fr_0.9fr] or [0.4fr_1fr]

---

## 9. Hero

### Home Hero (Cinematic Video Variant)

**Goal:** Bold hero with background video + simple CTA, premium and minimal.

**Layout**

- Single hero section with background video (full-bleed) + overlay gradient
- Copy anchored bottom-left (or center-left), max-w ~2xl
- No busy motion; rely on typography and spacing

**Video Layer**

- Background video: object-cover, absolute inset-0
- Overlay: subtle gradient for legibility (dark-to-transparent)
- Poster image always provided (instant paint)
- Video muted, loop, playsInline

**Intro Motion (C3-style, clean)**

- Soft fade + slight upward drift for H1, subcopy, CTAs
- Stagger: 80–120ms between items
- Only opacity + transform

**Breathing Scroll (0–200px)**

- Very subtle zoom/parallax on background video only:
  - translateY 0→10px
  - scale 1.00→1.02
- Transform only; avoid visible "zoom" effect.

**Env**

- `NEXT_PUBLIC_MEDIA_URL` — base for R2 media
- `NEXT_PUBLIC_HERO_VIDEO_KEY` — e.g. `videos/hero/intro-v1` (swap weekly without code change)

### Page Hero (Services, About)

- Kicker + H1 + subtitle
- space-y-4
- Optional: simple reveal on enter (no breathing)

---

## 10. Process Timeline

- Ordered list, gap-6
- Step: numbered circle (h-8 w-8, rounded-full)
- Title + description per step

---

## 11. Video Patterns

### Project Video (Inline)

- Aspect: 16:9
- Radius: 24px
- Border: black/10
- Poster-first: show poster with play button; load video on interaction if needed
- Play button: 64px circle, border white/80, hover scale (subtle)

### Background Video (Hero)

- Always muted, loop, playsInline
- Always include poster
- No autoplay if `prefers-reduced-motion: reduce`

---

## 12. Modal (Booking)

- Overlay: fixed inset-0, bg black/80
- Content: max-w-4xl, rounded-[28px], border white/10, bg black
- Close: top-right, rounded-full, bg white/10

---

## 13. Client Logos

- Flex wrap, gap-8–12
- Text: xs uppercase tracking 0.28em
- Links: hover color change

---

## 14. Motion System

### Scroll Reveal (Section cadence)

- Initial: opacity 0, y 10–20px, optional blur 4px
- In view: opacity 1, y 0, blur 0
- Duration: ~500ms ease-out
- Apply to: sections, not every small element
- Optional: stagger children inside a section (cards)

### Hover Micro-interactions

- Duration: 140–260ms
- Work cards: lift + image zoom + overlay fade + arrow nudge
- Buttons: translateY(-1px) + opacity

### Page Transitions (Route changes)

- **Deferred:** PageTransition is currently a no-op. Cross-fade (150–220ms) would require App Router setup.

### Reduced Motion

If user has `prefers-reduced-motion: reduce`:

- Disable breathing/parallax
- Disable staggers if needed
- Allow simple fades (or none)

---

## 15. Utility Classes

| Class | Effect |
|-------|--------|
| `lift-card` | Hover: translateY(-1px), border lightens |
| `image-zoom` | Hover: scale(1.03) |
| `image-fade` | Hover: opacity 1 |
| `heading-hover` | Hover: letter-spacing 0.06em |
| `link-underline` | Hover: bottom border scaleX(1) |
| `soft-grid` | Subtle 24px grid background |
| `page-shell` | Decorative gradient blurs |

---

## 16. Media Delivery Standard (Cloudflare R2)

### Why

- Keep site repo light
- Add videos weekly without redeploying heavy assets
- Avoid redundancy via strict naming/versioning

### Environment

```
NEXT_PUBLIC_MEDIA_URL=https://media.brightlinephotography.co
NEXT_PUBLIC_HERO_VIDEO_KEY=videos/hero/intro-v1
```

### Folder + Naming (non-negotiable)

```
videos/
  hero/
    intro-v1.mp4
    intro-v1.webm            (optional)
    intro-v1.poster.jpg

  projects/
    {project-slug}/
      teaser-v1.mp4
      teaser-v1.webm         (optional)
      teaser-v1.poster.jpg
```

### Rules

- Always version (-v1, -v2, …). Do not overwrite silently.
- Always include poster.
- MP4 required; WebM optional.

---

## 17. Video Export Requirements

### Background Hero

| Spec | Value |
|------|-------|
| Resolution | 1600×900 or 1920×1080 |
| FPS | 24 or 30 |
| Codec | H.264 |
| Bitrate (900p) | 2–4 Mbps |
| Bitrate (1080p) | 3–6 Mbps |
| Duration | 6–10 seconds loopable |
| File size | 5–25MB depending on length/motion |
| Poster | ~1600px wide JPG |

### Project Teasers

| Spec | Value |
|------|-------|
| Resolution | 1280×720 or 1920×1080 |
| FPS | 24/30 |
| Bitrate (720p) | 1.5–3 Mbps |
| Bitrate (1080p) | 3–6 Mbps |
| Duration | 10–30 seconds |
| File size | 10–50MB |

---

## 18. Pencil Checklist

When building in Pencil, create artboards for:

1. **Tokens** — Color swatches, type scale, spacing
2. **Buttons** — Primary, Ghost, Outline Light
3. **Cards** — Work, Service, Testimonial, FAQ, CTA, Stats
4. **Forms** — Input, label, submit
5. **Navbar** — Desktop + mobile + scrolled shrink state
6. **Footer**
7. **Hero** — Cinematic video hero (poster, video, overlays, CTA)
8. **Section** — Kicker + title + subtitle + grid (with reveal behavior notes)
9. **Process** — Timeline steps
10. **Video** — Poster + play state; project embed layout
11. **Motion** — Reveal + hover + page transition rules

---

## 19. Implementation Audit (Conservative Scope)

Use this to avoid drastic changes. Implement incrementally; defer non-essential enhancements.

### Implement Now

| Change | Rationale |
|--------|-----------|
| **Hero video** | Additive upgrade. Same layout (copy left, two-column), same CTAs, same stagger. Swaps image card for full-bleed video. Badge moves to overlay — minimal visual shift. |
| **Env vars** | `NEXT_PUBLIC_MEDIA_URL`, `NEXT_PUBLIC_HERO_VIDEO_KEY` — enables R2-first workflow. |
| **Poster fallback** | If video fails or autoplay blocked, poster shows. No blank state. |

### Skip or Defer

| Change | Reason |
|--------|--------|
| **Navbar smart shrink** | Current navbar (py-4 constant) works. Shrinking padding on scroll causes layout shift; conflicts with "no layout shift" principle. |
| **Count-up stats** | CredibilityBar is static. Count-up adds motion and complexity. Defer unless explicitly requested. |
| **Premium card hover (arrow nudge, overlay)** | WorkCard has no arrow. Current lift + image-zoom is sufficient. Adding overlay/arrow would require structural changes. |
| **Page transitions** | PageTransition is a no-op. Adding cross-fade requires App Router setup. Defer. |

### Design Judgement Calls

- **Hero badge:** Move to bottom-left overlay (as planned) — keeps the "2026 Portfolio" cue without blocking video. Hidden on mobile for clarity.
- **Blobs:** Simplify to `bg-white/10` on video hero — current warm/cool tints may clash with video. Neutral is safer.
- **Text colors:** Use explicit `text-white/70`, `text-white` on hero — ensures legibility on video; current `text-black/*` overrides work but explicit is clearer for video overlay.

---

## File References

- Tokens & utilities: `app/globals.css`
- Components: `components/*.tsx`
- Pages: `app/**/page.tsx`
