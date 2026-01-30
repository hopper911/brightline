import { withAuth } from "next-auth/middleware";

function getAdminEmails() {
  const raw =
    process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

const adminEmails = getAdminEmails();

function isAdminEmail(email?: string | null) {
  if (!email) return false;
  if (adminEmails.length === 0) return false;
  return adminEmails.includes(email.toLowerCase());
}

export default withAuth({
  callbacks: {
    authorized({ token, req }) {
      const pathname = req.nextUrl.pathname;
      if (pathname.startsWith("/admin/login")) return true;
      if (pathname.startsWith("/api/admin/login")) return true;
      if (pathname.startsWith("/api/admin/logout")) return true;
      return isAdminEmail(token?.email);
    },
  },
  pages: {
    signIn: "/admin/login",
  },
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
