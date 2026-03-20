"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE_NAME } from "@/lib/runtime/demo";

export async function enableDemoMode() {
  const c = await cookies();
  c.set(DEMO_COOKIE_NAME, "1", {
    path: "/",
    sameSite: "lax",
  });
  redirect("/studio");
}

export async function disableDemoMode() {
  const c = await cookies();
  c.set(DEMO_COOKIE_NAME, "0", {
    path: "/",
    sameSite: "lax",
  });
  redirect("/studio");
}

