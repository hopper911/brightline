"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { resolveClientAccessCode } from "@/lib/client-access";
import {
  CLIENT_GALLERY_SESSION_MAX_AGE_SEC,
  createClientGallerySessionToken,
} from "@/lib/client-gallery-session-token";
import { shouldUseSecureCookies } from "@/lib/cookie-secure";

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

  const resolved = await resolveClientAccessCode(code);
  if (!resolved.ok) {
    return { error: resolved.error };
  }
  const entry = resolved.access;

  const sessionToken = createClientGallerySessionToken(entry.id);
  if (!sessionToken) {
    return { error: "Unable to create access session." };
  }

  const jar = await cookies();
  const cookieBase = {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(),
    maxAge: CLIENT_GALLERY_SESSION_MAX_AGE_SEC,
  };

  jar.set("client_access", "true", cookieBase);
  jar.set("client_gallery", entry.gallerySlug, cookieBase);
  jar.set("client_access_session", sessionToken, cookieBase);
  jar.set("client_access_id", "", { ...cookieBase, maxAge: 0 });

  redirect(`/client/${entry.gallerySlug}`);
}
