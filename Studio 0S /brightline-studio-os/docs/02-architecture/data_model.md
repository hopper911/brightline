# Data Model

Overview of the Studio OS data model. Schema is defined in `lib/db/schema.sql`.

## Core entities

- **workspaces** – Multi-tenant root. Each workspace has plan, profile, settings.
- **users** – Users belong to a workspace. Email + role.
- **projects** – Client projects. Linked to workspace.
- **sessions** – Per-room working state. Last action, project context.
- **events** – Audit trail of agent and user actions.
- **drafts** – Generated outputs (replies, captions, briefs) awaiting review.
- **approvals** – Items requiring sign-off before being saved.

## Relationships

- projects → drafts, events, approvals
- sessions → room, project
- workspace → users, projects, profile, plan_limits
