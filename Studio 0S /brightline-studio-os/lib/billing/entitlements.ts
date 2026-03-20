import "server-only";

import { getDb } from "@/lib/db";

export type FeatureKey = "automation" | "advancedAgents" | "analytics";

export type Entitlements = Record<FeatureKey, boolean> & {
  // Future-proofing: allow numeric limits later without schema changes
  maxProjects?: number;
  maxSeats?: number;
};

export type Plan = {
  id: string;
  name: string;
  price: number;
  limits: Entitlements;
};

const DEFAULT_PLAN_ID = "starter";

function safeParseLimits(value: unknown): Entitlements {
  if (typeof value !== "string" || !value.trim()) {
    return { automation: false, advancedAgents: false, analytics: false };
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return { automation: false, advancedAgents: false, analytics: false };
    }
    const obj = parsed as Record<string, unknown>;
    return {
      automation: obj.automation === true,
      advancedAgents: obj.advancedAgents === true,
      analytics: obj.analytics === true,
      maxProjects: typeof obj.maxProjects === "number" ? obj.maxProjects : undefined,
      maxSeats: typeof obj.maxSeats === "number" ? obj.maxSeats : undefined,
    };
  } catch {
    return { automation: false, advancedAgents: false, analytics: false };
  }
}

export function getWorkspace(): { id: string; name: string; ownerId: string; planId: string } {
  const db = getDb();
  const row = db
    .prepare("SELECT id, name, owner_id AS ownerId, plan_id AS planId FROM workspaces ORDER BY created_at ASC LIMIT 1")
    .get() as { id: string; name: string; ownerId: string; planId: string } | undefined;

  if (!row) {
    // In practice this should not happen because db bootstrap creates one, but keep it safe.
    const workspaceId = `ws-${Date.now()}`;
    const ownerId = `usr-${Date.now()}`;
    const now = new Date().toISOString();
    db.prepare("INSERT INTO workspaces (id, name, owner_id, plan_id, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(workspaceId, "Default Workspace", ownerId, DEFAULT_PLAN_ID, now);
    return { id: workspaceId, name: "Default Workspace", ownerId, planId: DEFAULT_PLAN_ID };
  }

  if (!row.planId) {
    db.prepare("UPDATE workspaces SET plan_id = ? WHERE id = ?").run(DEFAULT_PLAN_ID, row.id);
    return { ...row, planId: DEFAULT_PLAN_ID };
  }

  return row;
}

export function getWorkspacePlan(): Plan {
  const db = getDb();
  const workspace = getWorkspace();

  const planRow = db
    .prepare("SELECT id, name, price, limits_json AS limitsJson FROM plans WHERE id = ?")
    .get(workspace.planId) as { id: string; name: string; price: number; limitsJson: string } | undefined;

  if (!planRow) {
    const fallbackRow = db
      .prepare("SELECT id, name, price, limits_json AS limitsJson FROM plans WHERE id = ?")
      .get(DEFAULT_PLAN_ID) as { id: string; name: string; price: number; limitsJson: string } | undefined;

    if (fallbackRow) {
      return {
        id: fallbackRow.id,
        name: fallbackRow.name,
        price: fallbackRow.price,
        limits: safeParseLimits(fallbackRow.limitsJson),
      };
    }

    return { id: DEFAULT_PLAN_ID, name: "Starter", price: 0, limits: safeParseLimits("") };
  }

  return {
    id: planRow.id,
    name: planRow.name,
    price: planRow.price,
    limits: safeParseLimits(planRow.limitsJson),
  };
}

export function getEntitlements(): Entitlements {
  return getWorkspacePlan().limits;
}

export function assertEntitled(feature: FeatureKey): void {
  const entitlements = getEntitlements();
  if (!entitlements[feature]) {
    throw new Error("upgrade_required");
  }
}

