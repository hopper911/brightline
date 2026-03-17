"use server";

import { getMissionControlData } from "@/lib/studio/missionControl";
import { listProjects } from "@/lib/projects/store";
import { getDrafts } from "@/lib/drafts/store";
import { getEvents } from "@/lib/events/logger";
import { searchArchive } from "@/lib/archive/store";

export async function getMissionControl() {
  return getMissionControlData();
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
  const query = q.trim().toLowerCase();
  if (query.length < 2) return [];

  const results: GlobalSearchResult[] = [];

  const projects = listProjects();
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

  const drafts = getDrafts();
  for (const d of drafts) {
    const searchable = (d.content + " " + d.room + " " + d.type).toLowerCase();
    if (searchable.includes(query)) {
      results.push({
        type: "draft",
        id: d.id,
        title: `${d.type} (${d.room})`,
        snippet: d.content.slice(0, 80) + (d.content.length > 80 ? "…" : ""),
        meta: d.room,
        href: d.room === "delivery" ? "/studio/delivery" : d.room === "marketing" ? "/studio/marketing" : `/studio/${d.room}`,
      });
    }
  }

  const events = getEvents();
  for (const e of events) {
    const searchable = (e.summary + " " + e.room + " " + e.agent).toLowerCase();
    if (searchable.includes(query)) {
      results.push({
        type: "event",
        id: e.id,
        title: e.summary.slice(0, 60) + (e.summary.length > 60 ? "…" : ""),
        meta: `${e.room} · ${e.agent}`,
        href: "/studio/events",
      });
    }
  }

  const archive = searchArchive({ q: q.trim(), limit: 10 });
  for (const a of archive) {
    results.push({
      type: "archive",
      id: a.id,
      title: a.name,
      snippet: a.client ? `Client: ${a.client}` : undefined,
      meta: a.year ?? undefined,
      href: `/studio/archive?project=${a.id}`,
    });
  }

  return results.slice(0, 20);
}
