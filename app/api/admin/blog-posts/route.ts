import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { getBlogPosts, saveBlogPosts } from "@/lib/blog-posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const posts = await getBlogPosts();
  return NextResponse.json({ ok: true, posts });
}

export async function PATCH(req: Request) {
  const isAdmin = await authorizeAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const input =
    body && typeof body === "object" && Array.isArray((body as { posts?: unknown }).posts)
      ? (body as { posts: unknown[] }).posts
      : body;

  const posts = await saveBlogPosts(input);
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
  return NextResponse.json({ ok: true, posts });
}
