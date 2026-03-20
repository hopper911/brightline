"use server";

import { getMissionControlData } from "@/lib/studio/missionControl";

const ROOM_TO_HREF: Record<string, string> = {
  reception: "/studio/crm",
  lounge: "/studio/crm/lounge",
  production: "/studio/production",
  editing: "/studio/production/editing",
  delivery: "/studio/production/delivery",
  marketing: "/studio/publishing",
  publishing: "/studio/publishing",
  archive: "/studio/projects/archive",
  strategy: "/studio/dashboard/strategy",
  events: "/studio/dashboard/events",
  sessions: "/studio/dashboard/sessions",
  automation: "/studio/settings/automation",
};

function getDraftHref(room: string): string {
  return ROOM_TO_HREF[room] ?? `/studio/${room}`;
}
import { isVercelVisualOnly } from "@/lib/runtime/vercel";
import type { AssistMode } from "@/lib/roomSettings/store";
import { isDemoMode } from "@/lib/runtime/demo";
import { demoSearch } from "@/lib/studio/demoData";
import { runWithDemoMode } from "@/lib/runtime/demoContext";
import { assertNotDemoMode } from "@/lib/runtime/demoGuard";
import { requireWorkspaceContext } from "@/lib/auth/workspaceContext";
import type { AutomationEvent } from "@/lib/automation/types";
import { redirect } from "next/navigation";

export async function getMissionControl() {
  if (isVercelVisualOnly()) return getMissionControlData();
  return getMissionControlData();
}

export async function getAssistMode(params: { room: string; projectId?: string | null }): Promise<AssistMode> {
  if (isVercelVisualOnly()) return "off";
  const { getRoomAssistMode } = await import("@/lib/roomSettings/store");
  return getRoomAssistMode(params.room, params.projectId ?? null);
}

export async function setAssistMode(params: {
  room: string;
  assistMode: AssistMode;
  projectId?: string | null;
}): Promise<{ ok: true; assistMode: AssistMode } | { ok: false; error: string }> {
  if (isVercelVisualOnly()) return { ok: false, error: "Vercel visual-only" };
  try {
    const demo = await isDemoMode();
    return runWithDemoMode(demo, async () => {
      assertNotDemoMode("Changing assist mode");
      const { setRoomAssistMode } = await import("@/lib/roomSettings/store");
      const updated = setRoomAssistMode({
        room: params.room,
        projectId: params.projectId ?? null,
        assistMode: params.assistMode,
      });
      return { ok: true, assistMode: updated.assistMode };
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to set assist mode" };
  }
}

export type GlobalSearchResult = {
  type: "project" | "draft" | "event" | "archive";
  id: string;
  title: string;
  snippet?: string;
  meta?: string;
  href?: string;
};

export async function globalSearch(q: string): Promise<GlobalSearchResult[]> {
  if (isVercelVisualOnly()) return [];
  if (await isDemoMode()) {
    const { projects, drafts, events } = demoSearch(q);
    const results: GlobalSearchResult[] = [];

    for (const p of projects) {
      results.push({
        type: "project",
        id: p.id,
        title: p.name,
        snippet: p.client ? `Client: ${p.client}` : undefined,
        meta: p.status ?? undefined,
        href: `/studio/production?project=${p.id}`,
      });
    }

    for (const d of drafts) {
      results.push({
        type: "draft",
        id: d.id,
        title: `${d.type} (${d.room})`,
        snippet: d.content.slice(0, 80) + (d.content.length > 80 ? "…" : ""),
        meta: d.room,
        href: getDraftHref(d.room),
      });
    }

    for (const e of events) {
      results.push({
        type: "event",
        id: e.id,
        title: e.summary.slice(0, 60) + (e.summary.length > 60 ? "…" : ""),
        meta: `${e.room} · ${e.agent}`,
        href: "/studio/dashboard/events",
      });
    }

    return results.slice(0, 20);
  }
  const ctx = await requireWorkspaceContext();
  const { listProjectsForWorkspace } = await import("@/lib/projects/store");
  const { getDraftsForWorkspace } = await import("@/lib/drafts/store");
  const { getEventsForWorkspace } = await import("@/lib/events/logger");
  const { searchArchive } = await import("@/lib/archive/store");

  const query = q.trim().toLowerCase();
  if (query.length < 2) return [];

  const results: GlobalSearchResult[] = [];

  const projects = listProjectsForWorkspace(ctx.workspaceId);
  for (const p of projects) {
    const searchable = [p.name, p.client, p.type, p.notes].filter(Boolean).join(" ").toLowerCase();
    if (searchable.includes(query)) {
      results.push({
        type: "project",
        id: p.id,
        title: p.name,
        snippet: p.client ? `Client: ${p.client}` : undefined,
        meta: p.status ?? undefined,
        href: `/studio/production?project=${p.id}`,
      });
    }
  }

  const drafts = getDraftsForWorkspace(ctx.workspaceId);
  for (const d of drafts) {
    const searchable = (d.content + " " + d.room + " " + d.type).toLowerCase();
    if (searchable.includes(query)) {
      results.push({
        type: "draft",
        id: d.id,
        title: `${d.type} (${d.room})`,
        snippet: d.content.slice(0, 80) + (d.content.length > 80 ? "…" : ""),
        meta: d.room,
        href: getDraftHref(d.room),
      });
    }
  }

  const events = getEventsForWorkspace(ctx.workspaceId);
  for (const e of events) {
    const searchable = (e.summary + " " + e.room + " " + e.agent).toLowerCase();
    if (searchable.includes(query)) {
      results.push({
        type: "event",
        id: e.id,
        title: e.summary.slice(0, 60) + (e.summary.length > 60 ? "…" : ""),
        meta: `${e.room} · ${e.agent}`,
        href: "/studio/dashboard/events",
      });
    }
  }

  const archive = searchArchive({ q: q.trim(), limit: 10, workspaceId: ctx.workspaceId });
  for (const a of archive) {
    results.push({
      type: "archive",
      id: a.id,
      title: a.name,
      snippet: a.client ? `Client: ${a.client}` : undefined,
      meta: a.year ?? undefined,
      href: `/studio/projects/archive?project=${a.id}`,
    });
  }

  return results.slice(0, 20);
}

export async function ensureNimbusExampleProject(
  _formData?: FormData
): Promise<void> {
  if (isVercelVisualOnly()) return;
  try {
    const demo = await isDemoMode();
    await runWithDemoMode(demo, async () => {
      assertNotDemoMode("Creating example project");
      const ctx = await requireWorkspaceContext();
      const { listProjectsForWorkspace, createProjectForWorkspace } = await import("@/lib/projects/store");

      const existing =
        listProjectsForWorkspace(ctx.workspaceId).find(
          (p) =>
            p.name.toLowerCase().includes("corporate headshots") ||
            (p.client ?? "").toLowerCase().includes("nimbus analytics")
        ) ?? null;
      if (existing) {
        redirect(`/studio/dashboard?spotlight=${encodeURIComponent(existing.id)}`);
      }

      const deliverBy = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const created = createProjectForWorkspace(ctx.workspaceId, {
        name: "Corporate Headshots – Nimbus Analytics",
        client: "Nimbus Analytics",
        type: "corporate_headshots",
        urgency: "normal",
        clientType: "b2b_saas",
        stage: "editing_in_progress",
        status: "in_progress",
        timeline: { deliverBy },
        location: "New York, NY",
        notes:
          "Example project used to connect agents. 8 executives, LinkedIn + website, tight turnaround. Confirm usage rights and delivery deadline.",
      });

      redirect(`/studio/dashboard?spotlight=${encodeURIComponent(created.id)}&welcome=1`);
    });
  } catch (e) {
    // ignore
  }
}

export async function runNimbusAutomationTest(
  formData: FormData
): Promise<void> {
  if (isVercelVisualOnly()) return;
  try {
    const demo = await isDemoMode();
    await runWithDemoMode(demo, async () => {
      assertNotDemoMode("Running automation test");
      const ctx = await requireWorkspaceContext();

      let projectId = String(formData.get("projectId") ?? "").trim();
      if (!projectId) {
        const { listProjectsForWorkspace } = await import("@/lib/projects/store");
        const existing =
          listProjectsForWorkspace(ctx.workspaceId).find(
            (p) =>
              p.name.toLowerCase().includes("corporate headshots") ||
              (p.client ?? "").toLowerCase().includes("nimbus analytics")
          ) ?? null;
        if (!existing) {
          // Will redirect
          await ensureNimbusExampleProject();
          return;
        }
        projectId = existing.id;
      }

      const inquiryText =
        "We need corporate headshots for 8 executives in NYC next month. Budget 6k. Need assets for LinkedIn and website.";

      const evt: AutomationEvent = {
        trigger: "new inquiry analyzed",
        room: "reception",
        projectId,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        payload: {
          text: inquiryText,
          summary: "Nimbus example inquiry routed through mission control automation test.",
        },
        createdAt: new Date().toISOString(),
      };

      const { DEFAULT_AUTOMATION_RULES } = await import("@/lib/automation/defaultRules");
      const { runWorkflow } = await import("@/lib/workflows");
      const workflowId = "new_client";
      await runWorkflow({ workflowId, event: evt, rules: DEFAULT_AUTOMATION_RULES, assistMode: "assist" });

      redirect(`/studio/dashboard?spotlight=${encodeURIComponent(projectId)}&automation=1`);
    });
  } catch (e) {
    // ignore
  }
}
