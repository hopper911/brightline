/**
 * Create a temporary fake hub case study (10-section template), verify, then delete.
 * Requires CONTENT_API_SECRET (or MIROTECH_ADMIN_HANDOFF_SECRET) in .env.local.
 *
 * Usage: node --env-file=.env.local tools/test-hub-project-lifecycle.mjs
 */

async function main() {
  const origin =
    process.env.MIROTECH_SITE_URL?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_MIROTECH_SITE_URL?.trim().replace(/\/$/, "") ||
    "https://mirotech.solutions";
  const bearer =
    process.env.CONTENT_API_SECRET?.trim() ||
    process.env.MIROTECH_ADMIN_HANDOFF_SECRET?.trim() ||
    process.env.ADMIN_HANDOFF_SECRET?.trim();
  if (!bearer || bearer.length < 16) {
    console.error("Missing CONTENT_API_SECRET / MIROTECH_ADMIN_HANDOFF_SECRET");
    process.exit(1);
  }

  const stamp = Date.now();
  const slug = `fake-case-study-lifecycle-${stamp}`;
  const galleryTitles = new Set([
    "Concepts and iteration",
    "Photography and design system",
    "Responsive experience",
    "Cross-channel applications",
  ]);
  const sections = [
    "Overview and role",
    "Business objective and audience",
    "Customer insight",
    "Creative strategy",
    "Concepts and iteration",
    "Photography and design system",
    "Responsive experience",
    "Cross-channel applications",
    "Accessibility and production decisions",
    "Target outcomes and reflection",
  ].map((title, i) => {
    const type =
      title === "Customer insight"
        ? "quote"
        : title === "Target outcomes and reflection"
          ? "metrics"
          : galleryTitles.has(title)
            ? "gallery"
            : "text";
    return {
      type,
      title,
      body:
        title === "Overview and role"
          ? "Fake lifecycle test — one-sentence business value for delete verification."
          : title === "Target outcomes and reflection"
            ? "Reflection: usability findings stay in body; metrics are targets only."
            : "",
      data:
        title === "Target outcomes and reflection"
          ? { items: [{ label: "Target: LP conversion", value: "3.5%" }] }
          : {},
      sortOrder: i,
    };
  });

  const payload = {
    title: `Fake Case Study Lifecycle ${stamp}`,
    slug,
    subtitle: "Temporary hub project for create/delete verification",
    summary: "Self-initiated fake case study used to verify Studio CMS edit/delete lifecycle.",
    year: new Date().getFullYear(),
    status: "DRAFT",
    categories: ["Test"],
    disciplines: ["Design"],
    tools: [],
    platforms: [],
    publishMirotech: false,
    publishBrightline: false,
    projectDisclaimer: "Self-initiated concept / sample data — fake lifecycle test only.",
    challenge: "Verify hub create and delete.",
    outcome: "Project removed cleanly after assertions.",
    role: "Test harness",
    sections,
  };

  async function hub(pathName, init) {
    const res = await fetch(`${origin}${pathName}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  console.log(`Creating fake case study at ${origin} …`);
  const created = await hub("/api/content/v1/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!created.res.ok || !created.data.ok || !created.data.project?.id) {
    console.error("CREATE_FAILED", created.res.status, created.data);
    process.exit(1);
  }
  const id = created.data.project.id;
  const sectionCount = Array.isArray(created.data.project.sections)
    ? created.data.project.sections.length
    : 0;
  console.log(`Created id=${id} slug=${slug} sections=${sectionCount}`);
  if (sectionCount !== 10) {
    console.error(`Expected 10 sections, got ${sectionCount}`);
    process.exit(1);
  }

  const got = await hub(`/api/content/v1/projects/${encodeURIComponent(id)}`);
  if (!got.res.ok || got.data.project?.slug !== slug) {
    console.error("GET_FAILED", got.res.status, got.data);
    process.exit(1);
  }
  console.log("GET ok — edit path can load this project");

  console.log("Deleting …");
  const deleted = await hub(`/api/content/v1/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!deleted.res.ok || !deleted.data.ok) {
    console.error("DELETE_FAILED", deleted.res.status, deleted.data);
    console.error(
      "If status is 405, deploy Mirotech with DELETE /api/content/v1/projects/[id] first."
    );
    process.exit(1);
  }
  console.log("Deleted", deleted.data.deleted);

  const gone = await hub(`/api/content/v1/projects/${encodeURIComponent(id)}`);
  if (gone.res.status !== 404 && gone.data.ok !== false) {
    console.error("Expected 404 after delete", gone.res.status, gone.data);
    process.exit(1);
  }
  console.log("PASS — fake case study created, verified (10 sections), deleted.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
