"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { findAccessByCode } from "@/lib/client-access";

export type ClientAccessState = {
  error?: string;
};

export async function clientAccessAction(
  _prevState: ClientAccessState,
  formData: FormData
): Promise<ClientAccessState> {
  const code = formData.get("code")?.toString()?.trim();
  if (!code) {
    return { error: "Please enter your access code." };
  }

  const entry = await findAccessByCode(code);
  if (!entry) {
    return { error: "Invalid access code." };
  }

  const jar = await cookies();
  jar.set("client_access", "true", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
  jar.set("client_gallery", entry.gallerySlug, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
  jar.set("client_access_id", entry.id, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(`/client/${entry.gallerySlug}`);
}
