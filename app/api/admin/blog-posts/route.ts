import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authorizeAdminRequest } from "@/lib/admin-auth";
import { revalidatePublicChrome } from "@/lib/revalidate-public-chrome";
import { getBlogPosts, saveBlogPosts } from "@/lib/blog-posts";
import { resolveBlogPostsMirotechSync } from "@/lib/platform/publishing/integrations/blog-mirotech-sync";

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
  try {
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
        ? (body as { posts: unknown[]; skipMirotechSync?: boolean })
        : body;

    const skipMirotechSync =
      input &&
      typeof input === "object" &&
      !Array.isArray(input) &&
      (input as { skipMirotechSync?: boolean }).skipMirotechSync === true;

    const postsInput =
      input && typeof input === "object" && Array.isArray((input as { posts?: unknown }).posts)
        ? (input as { posts: unknown[] }).posts
        : input;

    let posts = await saveBlogPosts(postsInput);

    let mirotechSync: Array<{
      postId: string;
      ok?: boolean;
      accepted?: boolean;
      jobId?: string;
      error?: string;
    }> = [];

    if (!skipMirotechSync) {
      try {
        const synced = await resolveBlogPostsMirotechSync(posts);
        mirotechSync = synced.results.map((r) => {
          if ("accepted" in r && r.accepted) {
            return { postId: r.postId, accepted: true, jobId: r.jobId };
          }
          return {
            postId: r.postId,
            ok: "ok" in r ? Boolean(r.ok) : false,
            error: "error" in r ? r.error : undefined,
          };
        });
        const idsChanged = synced.posts.some(
          (p, i) => p.mirotechJournalId !== posts[i]?.mirotechJournalId
        );
        if (idsChanged || synced.results.some((r) => "ok" in r && r.ok)) {
          posts = await saveBlogPosts(synced.posts);
        }
      } catch (err) {
        console.error("BLOG_MIROTECH_SYNC_ERROR", err);
        mirotechSync = [
          {
            postId: "",
            ok: false,
            error: err instanceof Error ? err.message : "Mirotech sync failed",
          },
        ];
      }
    }

    try {
      revalidatePath("/blog");
      revalidatePath("/blog/[slug]", "page");
      revalidatePath("/travel");
      revalidatePath("/travel/[slug]", "page");
      revalidatePath("/sitemap.xml");
      revalidatePublicChrome();
    } catch (err) {
      console.error("BLOG_POSTS_REVALIDATE_ERROR", err);
    }
    return NextResponse.json({ ok: true, posts, mirotechSync });
  } catch (err: unknown) {
    console.error("BLOG_POSTS_PATCH_ERROR", err);
    const message = err instanceof Error ? err.message : "Failed to save blog posts.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
