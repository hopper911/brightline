import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
async function main() {
  const s = await p.siteSetting.findUnique({ where: { key: "blog_posts:v1" } });
  const posts = JSON.parse(s?.value || "[]") as any[];
  console.log("total posts", posts.length);
  for (const post of posts) {
    const cs = post.caseStudy || {};
    if (cs.videoUrl || cs.videoEnabled || cs.aiVideoKey) {
      console.log(
        JSON.stringify({
          title: post.title,
          slug: post.slug,
          status: post.status,
          format: post.format,
          storyChapters: Array.isArray(post.storyChapters) ? post.storyChapters.length : 0,
          videoEnabled: cs.videoEnabled,
          videoUrl: (cs.videoUrl || "").slice(0, 140),
          aiVideoStatus: cs.aiVideoStatus,
          aiVideoKey: cs.aiVideoKey || "",
        })
      );
    }
  }
  const twin = posts.find(
    (x) => /twin/i.test(x.title || "") || /twin/i.test(x.slug || "")
  );
  if (twin) {
    console.log(
      "TWIN_FULL",
      JSON.stringify({
        title: twin.title,
        slug: twin.slug,
        status: twin.status,
        storyChapters: (twin.storyChapters || []).length,
        caseStudy: twin.caseStudy,
      })
    );
  } else {
    console.log("no twin tails post found");
  }
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
