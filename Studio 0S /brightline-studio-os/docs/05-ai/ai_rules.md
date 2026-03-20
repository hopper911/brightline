# Bright Line Studio OS — Agent Architecture

## Core Flow

User → Studio UI → Agent Router → Agent → Approved Tools → Result

## Shared Systems

All agent actions can create:

- events
- drafts
- sessions
- approvals
- project updates

## Main Agents

- **Concierge Agent**: handles inquiries
- **Producer Agent**: plans projects
- **Editing Agent**: scans image folders safely
- **Delivery Agent**: prepares handoff drafts
- **Marketing Agent**: creates captions and case studies
- **Archivist Agent**: searches and summarizes past work

## Safety Model

Agents do not access the computer directly.  
Agents can only use approved tools defined in code.  
Sensitive actions require approval.

## Result

A room-based, local-first, safe AI operating system for a photography business.

---

## 1. Full System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BRIGHT LINE STUDIO OS                       │
└─────────────────────────────────────────────────────────────────────┘

          YOU
           │
           ▼
┌───────────────────────┐
│   NEXT.JS STUDIO UI   │
│  /studio + room pages │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│      AGENT ROUTER     │
│ routes task by room   │
│ or action type        │
└───────────┬───────────┘
            │
            ├─────────────────────────────────────────────────────────────┐
            │                                                             │
            ▼                                                             ▼
┌───────────────────────┐                                     ┌───────────────────────┐
│   RECEPTION AGENT     │                                     │   PRODUCER AGENT      │
│ handles inquiries     │                                     │ handles project plans │
└───────────┬───────────┘                                     └───────────┬───────────┘
            │                                                             │
            ▼                                                             ▼
┌───────────────────────┐                                     ┌───────────────────────┐
│   TOOL REGISTRY       │                                     │   TOOL REGISTRY       │
│ summarize inquiry     │                                     │ brief / shot list     │
│ classify project      │                                     │ checklist tools       │
│ reply draft           │                                     └───────────────────────┘
└───────────────────────┘

            ├─────────────────────────────────────────────────────────────┐
            │                                                             │
            ▼                                                             ▼
┌───────────────────────┐                                     ┌───────────────────────┐
│    EDITING AGENT      │                                     │   DELIVERY AGENT      │
│ read-only image scan  │                                     │ handoff preparation   │
└───────────┬───────────┘                                     └───────────┬───────────┘
            │                                                             │
            ▼                                                             ▼
┌───────────────────────┐                                     ┌───────────────────────┐
│   TOOL REGISTRY       │                                     │   TOOL REGISTRY       │
│ scan folder           │                                     │ delivery checklist    │
│ blur detection        │                                     │ delivery email draft  │
│ duplicate check       │                                     │ final summary         │
└───────────────────────┘                                     └───────────────────────┘

            ├─────────────────────────────────────────────────────────────┐
            │                                                             │
            ▼                                                             ▼
┌───────────────────────┐                                     ┌───────────────────────┐
│   MARKETING AGENT     │                                     │   ARCHIVIST AGENT     │
│ captions + case study │                                     │ search + memory       │
└───────────┬───────────┘                                     └───────────┬───────────┘
            │                                                             │
            ▼                                                             ▼
┌───────────────────────┐                                     ┌───────────────────────┐
│   TOOL REGISTRY       │                                     │   TOOL REGISTRY       │
│ caption generator     │                                     │ archive search        │
│ case study generator  │                                     │ history summary       │
│ SEO copy              │                                     │ locate records        │
└───────────────────────┘                                     └───────────────────────┘

            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SHARED SYSTEM SERVICES                            │
│  sessions   events   drafts   approvals   projects   jobs            │
└─────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SQLITE DATABASE                              │
│ data/studio.db                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. How One Request Moves Through the System

**Example: new client inquiry**

```
User pastes inquiry into /studio/crm
        │
        ▼
Reception page sends request
        │
        ▼
Agent Router selects conciergeAgent
        │
        ▼
conciergeAgent calls:
- summarize_inquiry
- classify_project_type
- generate_reply_draft
        │
        ▼
Results returned to UI
        │
        ├── save draft
        ├── log event
        ├── update session
        └── optional handoff to Producer
```

---

## 3. Agent Handoff Pipeline

```
RECEPTION
   │
   │ lead analyzed
   ▼
PRODUCTION
   │
   │ brief + shot list created
   ▼
EDITING
   │
   │ folder scanned / review complete
   ▼
DELIVERY
   │
   │ delivery draft prepared
   ▼
MARKETING
   │
   │ caption + case study created
   ▼
ARCHIVE
   │
   │ project indexed and searchable
   ▼
LONG-TERM STUDIO MEMORY
```

---

## 4. Safety Model

```
                 UNSAFE MODEL
AI Agent ─────────────► Full Computer Access

                 SAFE BRIGHT LINE MODEL
AI Agent ─► Approved Tool ─► Result Preview ─► Approval if needed ─► Save
```

**Rule:** Agents never touch your machine directly. They only call tools you approved in code.

---

## 5. Per-Agent Diagrams

### Reception Agent

```
/studio/crm
      │
      ▼
conciergeAgent.ts
      │
      ├── summarize_inquiry
      ├── classify_project_type
      └── generate_reply_draft
      │
      ▼
UI result + draft + event + session
```

### Producer Agent

```
/studio/production
      │
      ▼
producerAgent.ts
      │
      ├── generate_project_brief
      ├── generate_shot_list
      └── generate_checklist
      │
      ▼
project draft + event + approval + session
```

### Editing Agent

```
/studio/production/editing
      │
      ▼
editingAgent.ts
      │
      ├── scan_image_folder
      ├── detect_blur
      ├── detect_low_resolution
      └── find_duplicate_like_filenames
      │
      ▼
scan report + event + session
```

### Delivery Agent

```
/studio/production/delivery
      │
      ▼
deliveryAgent.ts
      │
      ├── generate_delivery_checklist
      ├── generate_delivery_email_draft
      └── summarize_final_assets
      │
      ▼
delivery draft + approval + event
```

### Marketing Agent

```
/studio/publishing
      │
      ▼
marketingAgent.ts
      │
      ├── generate_instagram_caption
      ├── generate_case_study
      └── generate_seo_text
      │
      ▼
drafts + events + session
```

### Archivist Agent

```
/studio/projects/archive
      │
      ▼
archivistAgent.ts
      │
      ├── search_archive
      ├── summarize_project_history
      └── locate_project_records
      │
      ▼
search results + history summary + event
```

---

## 6. Database Relationship Diagram

```
projects
   │
   ├── drafts
   ├── events
   ├── approvals
   └── sessions

sessions   → track room state
events     → log agent actions
approvals  → gate sensitive saves
drafts     → store generated outputs
```

```
          ┌───────────┐
          │ projects  │
          └─────┬─────┘
                │
      ┌─────────┼─────────┬─────────┐
      ▼         ▼         ▼         ▼
   drafts    events   approvals  sessions
```

---

## 7. File Structure

```
brightline-studio-os/
│
├── app/
│   ├── studio/
│   │   ├── page.tsx                # redirects to /studio/dashboard
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # main mission control
│   │   │   ├── events/page.tsx     # event feed
│   │   │   ├── sessions/page.tsx   # session state view
│   │   │   └── strategy/page.tsx   # strategy room
│   │   ├── crm/
│   │   │   ├── page.tsx            # reception / inquiry analysis
│   │   │   └── lounge/page.tsx     # briefing / mood board room
│   │   ├── projects/
│   │   │   ├── page.tsx
│   │   │   └── archive/page.tsx    # searchable memory room
│   │   ├── production/
│   │   │   ├── page.tsx            # project planning room
│   │   │   ├── editing/page.tsx    # image scan room
│   │   │   ├── delivery/page.tsx   # handoff room
│   │   │   └── approvals/page.tsx  # approval queue
│   │   ├── publishing/page.tsx     # caption/case-study room
│   │   ├── finance/page.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx            # local AI / Ollama status
│   │   │   └── automation/page.tsx
│   │   └── demo/
│   │
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   ├── studio/
│   │   ├── StudioMap.tsx           # clickable room map
│   │   ├── StudioRoomCard.tsx      # room card / tile
│   │   ├── RoomDetailsPanel.tsx    # right-side selected room details
│   │   ├── SummaryCards.tsx        # top metrics
│   │   ├── EventFeed.tsx           # recent activity
│   │   ├── ApprovalsList.tsx       # approval list (or ApprovalQueue.tsx)
│   │   └── AgentStatusPanel.tsx    # per-agent status view
│   │
│   └── ui/
│       ├── StatusBadge.tsx
│       ├── Panel.tsx
│       ├── SectionHeader.tsx
│       └── MetricCard.tsx
│
├── lib/
│   ├── agents/
│   │   ├── router.ts               # routes tasks to the correct agent
│   │   ├── conciergeAgent.ts       # Reception agent
│   │   ├── producerAgent.ts        # Production agent
│   │   ├── editingAgent.ts         # Editing agent (or editingAgent.ts)
│   │   ├── deliveryAgent.ts        # Delivery agent
│   │   ├── marketingAgent.ts       # Marketing agent
│   │   └── archivistAgent.ts       # Archive agent
│   │
│   ├── tools/
│   │   ├── registry.ts             # allowed tools and policies
│   │   ├── inquiryTools.ts         # summarize/classify/reply
│   │   ├── projectTools.ts         # brief/shot list/checklist
│   │   ├── imageTools.ts           # scan/blur/duplicates
│   │   ├── deliveryTools.ts        # checklist/email/follow-up
│   │   ├── marketingTools.ts       # captions/case studies/SEO
│   │   └── archiveTools.ts         # search/history summaries
│   │
│   ├── ai/
│   │   ├── index.ts                # AI abstraction layer
│   │   └── ollama.ts               # optional local Ollama integration
│   │
│   ├── db/
│   │   ├── index.ts                # opens SQLite DB
│   │   └── schema.sql              # DB schema
│   │
│   ├── events/
│   │   └── logger.ts               # event creation and retrieval
│   │
│   ├── drafts/
│   │   └── store.ts                # save/load drafts
│   │
│   ├── approvals/
│   │   └── store.ts                # pending / approved / rejected
│   │
│   ├── sessions/
│   │   └── store.ts                # room memory / last action
│   │
│   ├── jobs/
│   │   ├── store.ts                # job create/list/run
│   │   ├── run.ts                  # run due jobs
│   │   └── executors.ts            # safe job implementations
│   │
│   └── studio/
│       └── mockData.ts             # temporary mock UI data
│
├── scripts/
│   └── image_scan.py               # read-only Python image scanner
│
├── data/
│   └── studio.db                   # SQLite database
│
└── docs/
    ├── architecture.md
    ├── roadmap.md
    └── agent-diagram.md            # this file
```

---

## 8. Core File Purposes

| File | Purpose |
|------|---------|
| **lib/agents/router.ts** | Receives task, decides which agent handles it, returns result. Mental model: `room = reception → conciergeAgent` |
| **lib/tools/registry.ts** | Defines all tools, which agents may call them, and whether approval is needed. Safety control center. |
| **lib/events/logger.ts** | Records everything important (e.g. "Marketing Agent generated caption draft for 220 Hudson St"). |
| **lib/sessions/store.ts** | Remembers each room's current state (e.g. "Editing room last scanned: storage/projects/220-hudson/raw"). |
| **lib/approvals/store.ts** | Queues anything that should not be saved automatically (e.g. "Producer Agent wants to save project brief – Status: pending"). |

Each agent file should only contain: role, allowed tools, output structure, handoff logic.

---

## 9. Example: One Real Project

**Project: 220 Hudson St**

1. Client inquiry arrives  
2. Reception Agent summarizes request  
3. Producer Agent creates office shoot brief  
4. Editing Agent scans folder after shoot  
5. Delivery Agent prepares handoff draft  
6. Marketing Agent writes case study + caption  
7. Archivist Agent stores searchable history  

Visible in the app as: events timeline, project record, saved drafts, session state, archive history.

---

## 10. Simple Explanation

The website is the office.  
Each room has one assistant.  
Each assistant can only use a few approved tools.  
When you ask for something, the right assistant handles it.  
Everything the assistant does gets remembered and logged.  
Nothing dangerous happens automatically.
