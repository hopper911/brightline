import "server-only";

import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";

import { getOrCreateUserByEmail } from "@/lib/auth/userStore";

function envOrEmpty(name: string): string {
  return process.env[name] ?? "";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Resend({
      apiKey: envOrEmpty("RESEND_API_KEY"),
      from: envOrEmpty("EMAIL_FROM"),
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const email = user?.email ?? token.email;
      if (!email) return token;

      const dbUser = getOrCreateUserByEmail(email);
      token.sub = dbUser.id;
      (token as typeof token & { workspaceId: string; role: "owner" | "admin" | "member" }).workspaceId = dbUser.workspaceId;
      (token as typeof token & { workspaceId: string; role: "owner" | "admin" | "member" }).role = dbUser.role;
      return token;
    },
    async session({ session, token }) {
      const workspaceId = (token as typeof token & { workspaceId?: string }).workspaceId ?? null;
      const role =
        (token as typeof token & { role?: "owner" | "admin" | "member" }).role ?? ("member" as const);

      session.user = {
        ...session.user,
        id: token.sub ?? "",
        workspaceId,
        role,
      };
      return session;
    },
  },
});

