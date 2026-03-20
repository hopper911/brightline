# README Diagrams — Bright Line Studio OS

Polished, README-ready documentation for a Clawbot-like, local-first, safe AI system for photography.

---

## 1. High-Level System Map

```
╔══════════════════════════════════════════════════════════════════════╗
║                     BRIGHT LINE STUDIO OS                           ║
║        Clawbot-like, local-first, safe AI system for photography    ║
╚══════════════════════════════════════════════════════════════════════╝

          You
           │
           ▼
┌──────────────────────────────┐
│        Studio UI             │
│  /studio + room workspaces   │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│        Agent Router          │
│ chooses the correct agent    │
│ based on room or task type   │
└──────────────┬───────────────┘
               │
   ┌───────────┼───────────┬───────────┬───────────┬───────────┐
   ▼           ▼           ▼           ▼           ▼           ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Recep-  │ │Producer│ │Editing │ │Delivery│ │Market- │ │Archive │
│tion    │ │Agent   │ │Agent   │ │Agent   │ │ing     │ │Agent   │
│Agent   │ │        │ │        │ │        │ │Agent   │ │        │
└────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘ └────┬───┘
     │          │          │          │          │          │
     └──────────┴──────────┴──────────┴──────────┴──────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         Tool Registry                                │
│ only approved tools may be called by each agent                      │
└──────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Shared System Services                           │
│    Events   Drafts   Sessions   Approvals   Projects   Jobs          │
└──────────────────────────────────────────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        SQLite Database                               │
│                         data/studio.db                               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Safe Execution Model

**UNSAFE MODEL**

```
AI Agent ───────────────► Full machine access ───────────────► Risk
```

**SAFE BRIGHT LINE MODEL**

```
AI Agent ─► Approved Tool ─► Preview / Result ─► Approval if needed ─► Save
```

**What this means:**

- agents do not control your computer directly
- agents do not get random shell access
- agents do not delete or move files by default
- important actions are logged
- sensitive saves can require approval

---

## 3. Room-to-Agent Map

| Room               | Assigned Agent       | Main Purpose                |
|--------------------|----------------------|-----------------------------|
| Reception          | Concierge Agent      | Analyze inquiries           |
| Client Lounge      | Briefing Assistant   | Clarify vision + brief      |
| Production Office  | Producer Agent       | Plan projects               |
| Editing Bay        | Editing Agent        | Read-only image review      |
| Delivery Suite     | Delivery Agent       | Prepare handoff             |
| Marketing Office   | Marketing Agent      | Create captions + copy      |
| Archive Vault      | Archivist Agent      | Search and summarize past   |
| Main Studio Floor  | Router / Mission Hub | Global overview             |

---

## 4. End-to-End Project Lifecycle

```
  Client Inquiry
        │
        ▼
┌─────────────────┐
│ Reception Agent │
│ summarizes lead │
└────────┬────────┘
         │ handoff
         ▼
┌─────────────────┐
│ Producer Agent  │
│ brief + shotlist│
└────────┬────────┘
         │ shoot happens in real life
         ▼
┌─────────────────┐
│ Editing Agent   │
│ scans raw folder│
└────────┬────────┘
         │ handoff
         ▼
┌─────────────────┐
│ Delivery Agent  │
│ delivery prep   │
└────────┬────────┘
         │ handoff
         ▼
┌─────────────────┐
│ Marketing Agent │
│ caption + copy  │
└────────┬────────┘
         │ handoff
         ▼
┌─────────────────┐
│ Archivist Agent │
│ index + memory  │
└─────────────────┘
```

---

## 5. Agent Permissions

**Reception Agent**

- Allowed: summarize inquiry, classify project type, draft reply
- Blocked: send email, access photo folders, run system commands

**Producer Agent**

- Allowed: generate project brief, generate shot list, generate checklist
- Blocked: modify calendar automatically, send client messages

**Editing Agent**

- Allowed: scan folder, detect blur, detect low resolution, find duplicate-like filenames
- Blocked: delete files, move files, rename files

**Delivery Agent**

- Allowed: generate delivery checklist, generate handoff draft, summarize final assets
- Blocked: send email, upload files automatically

**Marketing Agent**

- Allowed: generate caption, generate website copy, generate case study, generate SEO text
- Blocked: publish content, post to social media

**Archivist Agent**

- Allowed: search archive, summarize project history, find related records
- Blocked: destroy archive data, alter source files

---

## 6. Router Logic Diagram

```
                    ┌─────────────────────┐
                    │     User Action     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Agent Router     │
                    │ room / task based   │
                    └──────────┬──────────┘
                               │
       ┌───────────────┬───────┼────────┬───────────────┬───────────────┐
       ▼               ▼       ▼        ▼               ▼               ▼
  /reception     /production  /editing /delivery   /marketing      /archive
       │               │       │        │               │               │
       ▼               ▼       ▼        ▼               ▼               ▼
 Concierge       Producer   Editing   Delivery      Marketing      Archivist
   Agent           Agent     Agent      Agent         Agent          Agent
```

---

## 7. Database Relationship Diagram

```
                         ┌───────────────┐
                         │   projects    │
                         └───────┬───────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
   ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
   │    drafts     │      │    events     │      │   approvals   │
   └───────────────┘      └───────────────┘      └───────────────┘
                                 │
                                 ▼
                          ┌───────────────┐
                          │   sessions    │
                          └───────────────┘
```

**Summary:** projects are the center; drafts hold outputs; events record actions; approvals gate important saves; sessions remember current room state.
