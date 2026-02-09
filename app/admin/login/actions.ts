import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type LoginState = { error?: string };

export async function loginAction(
  _: LoginState,
  formData: FormData
): Promise<LoginState> {
  "use server";
  const accessCode = formData.get("accessCode");
  const next = formData.get("next")?.toString();
  const safeNext = next && next.startsWith("/admin") ? next : "/admin";

  if (!process.env.ADMIN_ACCESS_CODE) {
    return { error: "Admin access is not configured." };
  }

  if (typeof accessCode !== "string" || accessCode !== process.env.ADMIN_ACCESS_CODE) {
    return { error: "Invalid access code." };
  }

  const jar = await cookies();
  jar.set("admin_access", "true", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  });

  redirect(safeNext);
}
