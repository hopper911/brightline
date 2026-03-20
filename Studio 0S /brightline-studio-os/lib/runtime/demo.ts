import { cookies } from "next/headers";

export const DEMO_COOKIE_NAME = "bl_demo";

export async function isDemoMode(): Promise<boolean> {
  const c = await cookies();
  const v = c.get(DEMO_COOKIE_NAME)?.value;
  return v === "1" || v === "true";
}

