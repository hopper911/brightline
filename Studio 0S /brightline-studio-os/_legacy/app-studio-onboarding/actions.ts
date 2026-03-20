"use server";

import { redirect } from "next/navigation";
import { ensureWorkspaceContextCookies } from "@/lib/auth/workspaceContext";
import { upsertWorkspaceProfile, type MainGoal, type PhotographyType } from "@/lib/profile/store";

export type OnboardingSubmitInput = {
  photographyType: PhotographyType;
  servicesOffered: string[];
  mainLocation: string;
  mainGoal: MainGoal;
};

function normalizeServices(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 24);
}

function assertPhotographyType(value: unknown): PhotographyType {
  if (value === "architecture" || value === "real_estate" || value === "corporate" || value === "events" || value === "mixed") {
    return value;
  }
  throw new Error("Invalid photography type");
}

function assertMainGoal(value: unknown): MainGoal {
  if (value === "get_more_clients" || value === "streamline_workflow" || value === "scale_business") return value;
  throw new Error("Invalid main goal");
}

export async function submitOnboarding(input: OnboardingSubmitInput): Promise<void> {
  const ctx = await ensureWorkspaceContextCookies();
  const photographyType = assertPhotographyType(input.photographyType);
  const mainGoal = assertMainGoal(input.mainGoal);
  const mainLocation = (input.mainLocation ?? "").toString().trim();
  if (mainLocation.length < 2) throw new Error("Location is required");

  const servicesOffered = normalizeServices(input.servicesOffered);
  upsertWorkspaceProfile({
    workspaceId: ctx.workspaceId,
    photographyType,
    servicesOffered,
    mainLocation,
    mainGoal,
  });

  redirect("/studio?welcome=1");
}

