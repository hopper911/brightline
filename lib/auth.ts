import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Access Code",
      credentials: {
        code: { label: "Access Code", type: "password" },
      },
      async authorize(credentials) {
        const code = credentials?.code;
        if (!code) return null;
        const accessCode = process.env.ADMIN_ACCESS_CODE;
        if (!accessCode) return null;
        if (code !== accessCode) return null;
        return { id: "admin", name: "Admin", email: "admin@local" };
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.isAdmin = true;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = session.user.name || "Admin";
        (session.user as { isAdmin?: boolean }).isAdmin = Boolean(
          token.isAdmin
        );
      }
      return session;
    },
  },
};
