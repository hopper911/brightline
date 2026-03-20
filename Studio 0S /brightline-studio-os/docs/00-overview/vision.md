# Bright Line AI Company Blueprint

A full AI-powered photography company operating system — not a portfolio app, not a dashboard, but an entire photography business with AI departments.

---

## 1. Vision and Positioning

**The shift**

You are no longer building a portfolio app, a studio dashboard, or a personal assistant. You are building:

**Bright Line AI Studio** — A full photography business with AI departments.

Think of it like a real company: sales team, client success, production, editing, delivery, marketing, finance, archive, strategy. Each department gets one or more AI agents.

**Safety model:** Agents do not access the computer directly. They only call approved tools defined in code. Sensitive actions require approval.

---

## 2. Full Org Chart / Department Diagram

```
╔══════════════════════════════════════════════════════════════════════╗
║                    BRIGHT LINE AI PHOTOGRAPHY COMPANY               ║
║                   Founder Dashboard / Mission Control               ║
╚══════════════════════════════════════════════════════════════════════╝

   SALES              CLIENT SUCCESS       PRODUCTION          POST-PRODUCTION
┌────────────┐   ┌────────────┐      ┌────────────┐      ┌────────────┐
│ Lead       │   │ Intake     │      │ Producer   │      │ Editing    │
│ Intelligence│   │ Agent      │      │ Agent      │      │ Agent      │
│ Outreach   │   │ Booking    │      │ Shoot-Day  │      │ Retouch    │
│ Pricing +  │   │ Client     │      │ Assistant  │      │ Coord.     │
│ Proposal   │   │ Experience │      │            │      │            │
└────────────┘   └────────────┘      └────────────┘      └────────────┘

   DELIVERY         MARKETING + GROWTH      OPERATIONS + FINANCE    KNOWLEDGE + STRATEGY
┌────────────┐   ┌────────────┐         ┌────────────┐         ┌────────────┐
│ Delivery   │   │ Marketing  │         │ Operations │         │ Archivist  │
│ Agent      │   │ SEO +      │         │ Finance    │         │ BI Agent   │
│            │   │ Website    │         │            │         │ Founder    │
│            │   │ Social     │         │            │         │ Strategy   │
└────────────┘   │ Planner   │         └────────────┘         └────────────┘
                 └────────────┘
```

**Department summary**

| Department | Agents |
|------------|--------|
| SALES | Lead Intelligence, Outreach, Pricing + Proposal |
| CLIENT SUCCESS | Intake, Booking, Client Experience |
| PRODUCTION | Producer, Shoot-Day Assistant |
| POST-PRODUCTION | Editing, Retouch Coordination |
| DELIVERY | Delivery Agent |
| MARKETING + GROWTH | Marketing, SEO + Website, Social Content Planner |
| OPERATIONS + FINANCE | Operations, Finance |
| KNOWLEDGE + STRATEGY | Archivist, Business Intelligence, Founder Strategy |

---

## 3. Complete Agent List (19 Agents)

### 1. Lead Intelligence Agent

**Purpose:** Find and qualify business opportunities.

**What it does:**
- Organize inbound leads
- Score leads
- Identify industry type
- Spot high-value clients
- Prepare next-step suggestions

**Example output:**
```json
{
  "leadScore": 87,
  "industry": "real estate / architecture",
  "recommendedPackage": "property + lifestyle + executive add-on",
  "nextStep": "schedule discovery call"
}
```

**V1 safety:** Draft and classify only. No outreach.

---

### 2. Outreach Agent

**Purpose:** Help generate new business.

**What it does:**
- Research target businesses
- Draft cold outreach emails
- Draft LinkedIn outreach
- Prepare custom pitch language
- Create follow-up sequences

**V1 safety:** Draft outreach only. No send automatically. (V3 agent)

---

### 3. Pricing + Proposal Agent

**Purpose:** Turn leads into paid projects.

**What it does:**
- Recommend pricing ranges
- Generate proposal drafts
- Create scope summaries
- Create optional upsells
- Prepare estimate notes

**Example:** Corporate office shoot, 2-hour coverage, 20 final images → package recommendation, licensing language, proposal draft, upsell suggestions. (V2 agent)

---

### 4. Intake Agent (Concierge)

**Purpose:** Collect and structure client information.

**What it does:**
- Analyze inquiry text
- Extract project details
- Collect missing info
- Create intake summary
- Pass clean handoff to production

**Maps to:** Current Concierge Agent. (V1)

---

### 5. Booking Agent

**Purpose:** Manage booking flow.

**What it does:**
- Suggest next steps for scheduling
- Draft confirmation messages
- Generate prep reminders
- Track pending bookings
- Prepare booking checklist

**V1 safety:** Recommend and draft only. No direct calendar write, no auto-email. (V2 agent)

---

### 6. Producer Agent

**Purpose:** Run project planning.

**What it does:**
- Create project brief
- Create shot list
- Create deliverables checklist
- Create production notes
- Create gear list
- Create location planning notes

**Maps to:** Current Producer Agent. (V1)

---

### 7. Shoot-Day Assistant Agent

**Purpose:** Support the actual day of production.

**What it does:**
- Show shot progress checklist
- Track must-have shots
- Log notes from the shoot
- Capture reshoot notes
- Track client requests on-site

**V1 safety:** Log and track only. No file changes. (V3 agent)

---

### 8. Editing Agent

**Purpose:** Organize post-production review.

**What it does:**
- Scan image folders
- Flag blur
- Flag low-resolution files
- Check naming consistency
- Identify duplicate-like images
- Produce scan summary

**Maps to:** Current Editing Agent. (V1)

---

### 9. Retouch Coordination Agent

**Purpose:** Manage the retouch queue.

**What it does:**
- Track which images need retouch
- Categorize retouch type
- Create retouch notes
- Track before/after status
- Hand off to delivery when finished

**Note:** Editing Agent = inspection. Retouch Agent = workflow control. (V3 agent)

---

### 10. Delivery Agent

**Purpose:** Prepare final handoff.

**What it does:**
- Build delivery checklist
- Summarize final assets
- Draft gallery delivery email
- Prepare licensing notes
- Create follow-up reminders

**Maps to:** Current Delivery Agent. (V1)

---

### 11. Client Experience Agent

**Purpose:** Improve retention and client satisfaction.

**What it does:**
- Draft thank-you notes
- Suggest follow-up timing
- Track repeat client opportunities
- Identify upsell moments
- Prepare review request text

**V1 safety:** Drafts and suggestions only. No automatic outreach. (V3 agent)

---

### 12. Marketing Agent

**Purpose:** Turn projects into content.

**What it does:**
- Instagram captions
- Project descriptions
- Blog intros
- Google Business posts
- LinkedIn copy
- Email newsletter blurbs

**Maps to:** Current Marketing Agent. (V1)

---

### 13. SEO + Website Agent

**Purpose:** Make the business discoverable.

**What it does:**
- Write SEO page titles
- Write meta descriptions
- Suggest keywords
- Generate project schema ideas
- Create location-based page drafts

**Example:** "Office Interior Photography Jersey City", "Corporate Headshot Photographer NYC". (V2 agent)

---

### 14. Social Content Planner Agent

**Purpose:** Build a content pipeline.

**What it does:**
- Turn one shoot into multiple content pieces
- Suggest reels, carousels, story frames
- Create posting calendar drafts
- Identify best hooks

**V1 safety:** Plans and drafts only. No publishing. (V3 agent)

---

### 15. Finance Agent

**Purpose:** Help run the money side.

**What it does:**
- Draft invoice notes
- Track project payment status
- Summarize revenue by project type
- Estimate profitability
- Flag unpaid jobs
- Categorize expense notes

**V1 safety:** No direct banking access. Tracking and summaries only. (V3 agent)

---

### 16. Operations Agent

**Purpose:** Keep the business organized.

**What it does:**
- Track workload
- Highlight overdue tasks
- Summarize pipeline health
- Identify bottlenecks
- Suggest next priorities

**Maps to:** Jobs system for safe summaries. (V2 agent)

---

### 17. Archivist Agent

**Purpose:** Preserve long-term memory.

**What it does:**
- Search old jobs
- Organize project history
- Compare similar projects
- Find repeat clients
- Locate drafts and notes

**Maps to:** Current Archivist Agent. (V1)

---

### 18. Business Intelligence Agent

**Purpose:** Turn company data into strategy.

**What it does:**
- Analyze which project types are most profitable
- Show which industries convert best
- Track which marketing channels bring leads
- Identify repeat client patterns
- Surface what to prioritize next quarter

**V1 safety:** Read-only analytics. No data alteration. (V3 agent)

---

### 19. Founder Strategy Agent

**Purpose:** Support the founder as CEO.

**What it does:**
- Daily summary
- Weekly priorities
- Business health overview
- Growth ideas
- Risk alerts
- Suggested focus areas

**Example output:** "This week: 3 warm leads need replies, 2 projects ready for delivery, architecture shoots converting 2x better than restaurant shoots, recommend publishing 220 Hudson case study." (V1 — can be implemented via Jobs + mission control summary)

---

## 4. Room Map (Company Headquarters)

| Wing | Room | Room ID | Primary Agent |
|------|------|---------|---------------|
| Front of House | Reception | `reception` | Intake Agent |
| Front of House | Sales Office | `sales` | Lead Intelligence, Pricing + Proposal |
| Front of House | Client Lounge | `lounge` | Booking, Client Experience |
| Production Wing | Production Office | `production` | Producer Agent |
| Production Wing | Shoot Floor | `shoot-floor` | Shoot-Day Assistant |
| Production Wing | Editing Bay | `editing` | Editing Agent |
| Production Wing | Retouch Desk | `retouch` | Retouch Coordination |
| Delivery Wing | Delivery Suite | `delivery` | Delivery Agent |
| Delivery Wing | Client Care Desk | `client-care` | Client Experience |
| Growth Wing | Marketing Office | `marketing` | Marketing Agent |
| Growth Wing | SEO / Website Lab | `seo` | SEO + Website Agent |
| Growth Wing | Content Planning Room | `content-planning` | Social Content Planner |
| Back Office | Finance Office | `finance` | Finance Agent |
| Back Office | Operations Desk | `operations` | Operations Agent |
| Back Office | Archive Vault | `archive` | Archivist, BI Agent |
| Back Office | Strategy Room | `strategy` | Founder Strategy Agent |
| Hub | Main Studio Floor | `main-studio` | Mission Control / Router |

**Current implementation:** The app uses 8 rooms (reception, lounge, production, main-studio, editing, delivery, marketing, archive). New rooms can be added incrementally.

---

## 5. Handoff Flow

```
Lead comes in
      │
      ▼
Lead Intelligence Agent scores it
      │
      ▼
Intake Agent structures it
      │
      ▼
Pricing + Proposal Agent drafts offer
      │
      ▼
Booking Agent prepares booking flow
      │
      ▼
Producer Agent creates brief and shot list
      │
      ▼
Shoot-Day Assistant tracks production notes
      │
      ▼
Editing Agent scans assets
      │
      ▼
Retouch Coordination Agent tracks final polish
      │
      ▼
Delivery Agent prepares handoff
      │
      ▼
Client Experience Agent handles follow-up
      │
      ▼
Marketing Agent creates content
      │
      ▼
SEO Agent optimizes website copy
      │
      ▼
Archivist Agent stores project history
      │
      ▼
Business Intelligence Agent learns from data
      │
      ▼
Founder Strategy Agent gives summary and priorities
```

---

## 6. Tool Permissions Matrix

| Agent | Allowed Tools | Blocked | Approval Required |
|-------|---------------|---------|-------------------|
| Intake (Concierge) | summarize_inquiry, classify_project_type, generate_reply_draft | send email, access photo folders, shell | reply draft |
| Producer | generate_project_brief, generate_shot_list, generate_checklist | modify calendar, send client messages | project brief, shot list |
| Editing | scan_image_folder, detect_blur, detect_low_resolution, find_duplicate_like_filenames | delete, move, rename files | — |
| Delivery | generate_delivery_checklist, generate_delivery_email_draft, summarize_final_assets, generate_followup_text | send email, upload files | delivery draft save |
| Marketing | generate_instagram_caption, generate_case_study, generate_seo_text | publish, post to social | case study |
| Archivist | search_archive, summarize_project_history, locate_project_records | destroy archive, alter source files | — |
| Lead Intelligence | (V2) score_lead, classify_industry | send outreach | — |
| Pricing + Proposal | (V2) recommend_pricing, generate_proposal_draft | execute contracts | proposal |
| Booking | (V2) draft_confirmation, suggest_schedule | calendar write, auto-email | — |
| SEO + Website | (V2) generate_seo_title, generate_meta_description | publish pages | — |
| Operations | (V2) summarize_pipeline, flag_overdue | modify data | — |
| Others (V3) | Per-agent; draft-only by default | execute, publish, pay | Sensitive drafts |

---

## 7. V1 / V2 / V3 Roadmap

### V1 — Core Operations (Current + Near-Term)

| Agent | Status | Notes |
|-------|--------|-------|
| Intake Agent | Implemented (Concierge) | Maps to conciergeAgent.ts |
| Producer Agent | Implemented | Maps to producerAgent.ts |
| Editing Agent | Implemented | Maps to editingAgent.ts |
| Delivery Agent | Implemented | Maps to deliveryAgent.ts |
| Marketing Agent | Implemented | Maps to marketingAgent.ts |
| Archivist Agent | Implemented | Maps to archivistAgent.ts |
| Founder Strategy | Partial | Mission control + Jobs provide summary; dedicated agent later |

**7 agents.** Enough to make the system feel like a company.

### V2 — Revenue Growth

| Agent | Notes |
|-------|-------|
| Lead Intelligence Agent | Score and qualify leads |
| Pricing + Proposal Agent | Proposal drafts, pricing suggestions |
| Booking Agent | Confirmations, prep reminders (draft only) |
| SEO + Website Agent | Titles, meta, location pages |
| Operations Agent | Pipeline summary, workload, bottlenecks |

**5 agents.** Adds sales and operations.

### V3 — Full Company

| Agent | Notes |
|-------|-------|
| Outreach Agent | Cold outreach drafts |
| Shoot-Day Assistant Agent | On-location notes and shot tracking |
| Retouch Coordination Agent | Retouch queue workflow |
| Client Experience Agent | Thank-yous, follow-ups, testimonials |
| Finance Agent | Invoice notes, payment tracking |
| Business Intelligence Agent | Profitability, conversion, strategy insights |
| Social Content Planner Agent | Content calendar, multi-format plans |

**7 agents.** Completes the full company.

---

## 8. Full Company Workflow (Step-by-Step)

```
1. Lead comes in          → Lead Intelligence scores it
2. Intake structures it   → Clean handoff to pricing
3. Pricing drafts offer   → Proposal + upsells
4. Booking prepares flow  → Confirmations, prep checklist
5. Producer creates plan  → Brief, shot list, gear
6. Shoot-Day Assistant    → Tracks notes, must-haves
7. Editing scans assets   → Blur, duplicates, naming
8. Retouch coordinates    → Queue, handoff to delivery
9. Delivery prepares      → Checklist, email, licensing
10. Client Experience     → Thank-you, follow-up, review
11. Marketing creates     → Captions, case study, SEO
12. SEO optimizes         → Page titles, meta, schema
13. Archivist stores      → Searchable history
14. BI analyzes           → Profitability, conversion
15. Founder Strategy      → Summary, priorities, alerts
```

---

## 9. Example Scenario: Jersey City Real Estate Developer

**Input:** "Hi, we need photography for a renovated office in Jersey City, including interiors, executive portraits, and website images."

**Step 1 — Lead Intelligence Agent**
- High-value lead
- Architecture + executive cross-sell opportunity

**Step 2 — Intake Agent**
- Renovated office, Jersey City
- 30 final images
- Website + leasing materials

**Step 3 — Pricing + Proposal Agent**
- Package range
- Licensing add-on
- Headshots upsell

**Step 4 — Producer Agent**
- Project brief
- Skyline-focused shot list
- Gear checklist

**Step 5 — Editing Agent**
- 342 raws scanned
- 11 blur candidates
- 4 naming issues

**Step 6 — Delivery Agent**
- Delivery email draft
- Checklist
- Usage notes

**Step 7 — Marketing Agent**
- Project page copy
- Instagram caption
- LinkedIn post

**Step 8 — Archivist Agent**
- Project pattern stored
- Client type indexed
- Future proposal reference

**Step 9 — Founder Strategy Agent**
- "Commercial office work continues to be one of the strongest verticals. Recommend building a dedicated office interiors landing page and pitching similar properties in Harborside."

---

## 10. Three-Layer Platform Model

**Layer 1 — Core Operations**
- Intake
- Producer
- Editing
- Delivery
- Marketing
- Archive

**Layer 2 — Revenue Growth**
- Lead Intelligence
- Pricing + Proposal
- SEO + Website
- Client Experience

**Layer 3 — Executive Intelligence**
- Finance
- Operations
- Business Intelligence
- Founder Strategy

---

## 11. Mental Model Summary

- Each agent = one employee
- Each room = one department
- Each tool = what that employee is allowed to use
- Each handoff = one department passing work to another
- Each event = company activity log
- Each approval = founder sign-off

**What makes this a full company, not just a tool**

Because it covers: getting clients, converting clients, planning projects, running shoots, processing work, delivering work, marketing work, learning from work, growing the business.
