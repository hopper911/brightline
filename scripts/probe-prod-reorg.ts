import { createAdminSessionToken } from "@/lib/admin-session";

async function main() {
  const t = createAdminSessionToken();
  if (!t) {
    console.error("Could not mint admin session — check ADMIN_SESSION_SECRET");
    process.exit(1);
  }
  const res = await fetch("https://brightlinephotography.com/api/admin/r2/tools", {
    method: "POST",
    headers: {
      Cookie: `admin_access=${t}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ op: "mirotech-reorg-manifest" }),
  });
  const data = await res.json().catch(() => ({}));
  console.log(JSON.stringify({ status: res.status, ...data }, null, 2).slice(0, 4000));
}

main();
