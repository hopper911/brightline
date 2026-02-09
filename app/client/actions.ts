"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findAccessByCode } from "@/lib/client-access";

export type ClientAccessState = { error?: string };

export async function clientAccessAction(
  _: ClientAccessState,
  formData: FormData
): Promise<ClientAccessState> {
  "use server";
  const code = formData.get("code");
  if (typeof code !== "string" || !code.trim()) {
    return { error: "Access code is required." };
  }

  const token = code.trim();
  const access = await findAccessByCode(token);
  if (!access) {
    return { error: "That access code is not valid." };
  }

  const jar = await cookies();
  jar.set("client_access", "true", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  jar.set("client_gallery", access.gallerySlug, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  jar.set("client_access_id", access.id, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(`/client/${access.gallerySlug}`);
}
