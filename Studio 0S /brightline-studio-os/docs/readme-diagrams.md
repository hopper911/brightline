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
- important actions can be reviewed before being saved

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

```
╔══════════════════════════════════════════════════════════════════════╗
║                        AGENT PERMISSIONS                            ║
╚══════════════════════════════════════════════════════════════════════╝
```

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

## 7. Tool Calling Flow

```
┌──────────────┐
│  Room UI     │
└──────┬───────┘
       │ user action
       ▼
┌──────────────┐
│ Agent        │
│ decides steps│
└──────┬───────┘
       │ calls approved tool
       ▼
┌──────────────┐
│ Tool         │
│ returns data │
└──────┬───────┘
       │
       ├────────► save draft
       ├────────► log event
       ├────────► update session
       └────────► create approval if needed
```

---

## 8. Shared Services Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SHARED SERVICES                             │
├─────────────────────────────────────────────────────────────────────┤
│ Events     │ Audit trail of what each agent did                     │
│ Drafts     │ Generated outputs like replies, captions, briefs       │
│ Sessions   │ Current working memory per room                        │
│ Approvals  │ Items waiting for your sign-off                        │
│ Projects   │ Core project records and status                        │
│ Jobs       │ Safe background reminders and summaries                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 9. Database Relationship Diagram

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

**A simpler way to read it:**

- projects are the center
- drafts hold outputs
- events record actions
- approvals gate important saves
- sessions remember current room state

---

## 10. One Real Example

**Example: office photography inquiry**

**Input:**

> "Hi, we need photography for a renovated office in Jersey City, including interiors, executive portraits, and website images."

**Reception Agent:**

- summarizes request
- classifies it as Architecture / Corporate
- drafts reply

**Producer Agent:**

- creates project brief
- creates shot list
- creates gear checklist

**Editing Agent:**

- scans raw folder after shoot
- flags blurry or low-res files

**Delivery Agent:**

- creates delivery checklist
- drafts handoff email

**Marketing Agent:**

- creates website copy
- creates Instagram caption
- creates SEO title

**Archivist Agent:**

- stores searchable project history

---

## 11. File Structure Diagram

```
brightline-studio-os/
│
├── app/
│   └── studio/
│       ├── page.tsx               # mission control
│       ├── reception/page.tsx     # inquiry room
│       ├── lounge/page.tsx        # briefing room
│       ├── production/page.tsx    # planning room
│       ├── editing/page.tsx       # image review room
│       ├── delivery/page.tsx      # handoff room
│       ├── marketing/page.tsx     # content room
│       ├── archive/page.tsx       # memory room
│       ├── approvals/page.tsx     # sign-off queue
│       ├── events/page.tsx        # activity log
│       ├── sessions/page.tsx      # room memory
│       ├── jobs/page.tsx          # safe jobs
│       └── settings/page.tsx      # local AI status
│
├── lib/
│   ├── agents/                    # each room assistant
│   ├── tools/                     # approved capabilities
│   ├── ai/                        # Ollama / fallback layer
│   ├── db/                        # SQLite setup
│   ├── events/                    # event logger
│   ├── drafts/                    # output storage
│   ├── approvals/                 # approval queue
│   ├── sessions/                  # room memory
│   └── jobs/                      # safe local jobs
│
├── components/                    # UI building blocks
├── scripts/                       # read-only Python tools
├── data/studio.db                 # SQLite database
└── docs/                          # architecture docs
```

---

## 12. Beginner-Friendly Explanation

Bright Line Studio OS works like a digital photography studio.

- The app is the building
- Each room is a department
- Each department has one AI assistant
- Each assistant can only use approved tools
- Important actions are logged
- Sensitive saves can require approval
- The system remembers where you left off
- Nothing dangerous happens automatically

---

## 13. README Order Recommendation

Suggested order for your main README:

1. Project title
2. One-paragraph explanation
3. High-level architecture diagram
4. Room-to-agent map
5. Project lifecycle diagram
6. Safety model
7. File structure
8. Roadmap
