"use server";

import { signIn } from "@/lib/auth/auth";

export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("Enter a valid email address.");
  }
  await signIn("email", { email, redirectTo: "/studio" });
}

