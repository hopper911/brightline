# Core – Business Logic Layer

This folder holds domain logic, services, and utilities that are not tied to UI routes.

**Structure:**
- `crm/` – Lead and client management logic
- `projects/` – Project lifecycle, jobs, archive
- `finance/` – Invoicing, expenses, payments
- `media/` – Asset ingestion, processing, delivery
- `automation/` – Workflow rules, triggers, approval flows

**Migration plan:** Extract non-UI logic from `lib/` into `core/` gradually. Route handlers and components stay in `app/` and `components/`; they import from `core/` for domain operations.
