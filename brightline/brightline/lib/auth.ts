import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Access Code",
      credentials: { code: { label: "Code", type: "text" } },
      async authorize(credentials) {
        const expected = process.env.ADMIN_ACCESS_CODE;
        if (!expected || credentials?.code !== expected) return null;
        return { id: "admin", email: "admin@brightlinephotography.co", isAdmin: true };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user && (user as { isAdmin?: boolean }).isAdmin) {
        token.isAdmin = true;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { isAdmin?: boolean }).isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
  },
  pages: { signIn: "/admin/login" },
  session: { strategy: "jwt" },
};
