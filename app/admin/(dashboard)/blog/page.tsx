import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { getBlogPosts } from "@/lib/blog-posts";
import BlogAdminClient from "./blog-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Blog · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default async function AdminBlogPage() {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const posts = await getBlogPosts();
  return <BlogAdminClient initialPosts={posts} />;
}
