import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin-emails";

function resolveEmailServer() {
  if (process.env.EMAIL_SERVER) return process.env.EMAIL_SERVER;

  const host = process.env.EMAIL_SERVER_HOST;
  const port = process.env.EMAIL_SERVER_PORT;
  const user = process.env.EMAIL_SERVER_USER;
  const pass = process.env.EMAIL_SERVER_PASSWORD;
  const secure = process.env.EMAIL_SERVER_SECURE;

  if (!host || !port || !user || !pass) return undefined;

  return {
    host,
    port: Number(port),
    auth: { user, pass },
    secure: secure === "true",
  };
}

const emailServer = resolveEmailServer() ?? "";
const emailFrom = process.env.EMAIL_FROM ?? "";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    EmailProvider({
      server: emailServer,
      from: emailFrom,
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    async signIn({ user }) {
      return isAdminEmail(user?.email);
    },
  },
};
