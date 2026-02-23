import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { isAdminEmail } from "@/lib/admin-emails";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        if (!isAdminEmail(credentials.email)) return null;
        return { id: "admin", email: credentials.email, isAdmin: true };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.isAdmin = (user as { isAdmin?: boolean }).isAdmin;
      }
      return token;
    },
    session({ session, token }) {
      if (session?.user) {
        (session.user as { isAdmin?: boolean }).isAdmin = token.isAdmin;
      }
      return session;
    },
  },
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};
