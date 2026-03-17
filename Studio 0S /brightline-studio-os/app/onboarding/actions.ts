"use server";

import { z } from "zod";
import { getDb } from "@/lib/db";
import { ensureWorkspaceContextCookies } from "@/lib/auth/workspaceContext";

const onboardingSchema = z.object({
  businessType: z.string().min(1).max(120),
  servicesOffered: z.array(z.string().min(1).max(80)).max(20),
  mainLocation: z.string().min(1).max(120),
  styleFocus: z.array(z.string().min(1).max(80)).max(20),
  goals: z.array(z.string().min(1).max(120)).max(20),
});

export type SaveOnboardingInput = z.infer<typeof onboardingSchema>;

function mapBusinessTypeToPhotographyType(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (v.includes("architect")) return "architecture";
  if (v.includes("real estate") || v.includes("real_estate")) return "real_estate";
  if (v.includes("corporate") || v.includes("brand")) return "corporate";
  if (v.includes("event")) return "events";
  return "mixed";
}

function mapGoalsToMainGoal(goals: string[]): string | null {
  const joined = goals.map((g) => g.toLowerCase()).join(" | ");
  if (joined.includes("lead") || joined.includes("client")) return "get_more_clients";
  if (joined.includes("faster") || joined.includes("delivery") || joined.includes("workflow")) return "streamline_workflow";
  if (joined.includes("recurring") || joined.includes("scale")) return "scale_business";
  return null;
}

export async function saveOnboarding(input: SaveOnboardingInput): Promise<{ ok: true }> {
  const parsed = onboardingSchema.parse(input);
  const ctx = await ensureWorkspaceContextCookies();
  const db = getDb();
  const now = new Date().toISOString();

  const photographyType = mapBusinessTypeToPhotographyType(parsed.businessType);
  const mainGoal = mapGoalsToMainGoal(parsed.goals);
  const goalsJson = JSON.stringify([mainGoal].filter(Boolean).concat(parsed.goals));

  db.prepare(
    `INSERT INTO workspace_profile (
        workspace_id, business_type, services_offered_json, main_location, style_focus_json, goals_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(workspace_id) DO UPDATE SET
        business_type = excluded.business_type,
        services_offered_json = excluded.services_offered_json,
        main_location = excluded.main_location,
        style_focus_json = excluded.style_focus_json,
        goals_json = excluded.goals_json,
        updated_at = excluded.updated_at`
  ).run(
    ctx.workspaceId,
    photographyType,
    JSON.stringify(parsed.servicesOffered),
    parsed.mainLocation,
    JSON.stringify(parsed.styleFocus),
    goalsJson,
    now,
    now
  );

  return { ok: true };
}

