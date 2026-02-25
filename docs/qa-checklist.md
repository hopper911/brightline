# QA checklist — Bright Line Photography

Lightweight visual regression and smoke checklist. Use before release.

## Pages to verify

- [ ] **Homepage** (/)
  - Hero loads; primary CTA "View work" and secondary Contact visible above fold
  - 3 pillar cards link to /work/campaign, /work/spaces, /work/corporate
  - Client logos strip and testimonials render
- [ ] **Work index** (/work)
  - 3 pillar cards with correct labels and links
- [ ] **Pillar pages** (/work/campaign, /work/spaces, /work/corporate)
  - Projects list; project links go to correct /work/{section}/{slug}
- [ ] **Section pages** (/work/acd, /work/rea, /work/cul, /work/biz, /work/tri)
  - Still work; project grid and links correct
- [ ] **Project detail** (/work/{section}/{projectSlug})
  - Hero, media, and copy render
- [ ] **Case studies** (/case-studies)
  - 2–3 cards; links to detail pages
- [ ] **Case study detail** (/case-studies/{slug})
  - Challenge, approach, result, images
- [ ] **Contact** (/contact)
  - Form and CTAs
- [ ] **About** (/about)
- [ ] **Services** (/services and /services/{slug})

## Viewports

- [ ] Desktop (1280px+)
- [ ] Tablet (768px)
- [ ] Mobile (375px)

## Build and runtime

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] No console errors on homepage, /work, one project page, contact
- [ ] Admin: /admin/login still works (if applicable)
- [ ] Upload pipeline still works (if applicable)
