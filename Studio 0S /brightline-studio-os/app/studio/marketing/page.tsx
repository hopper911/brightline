import Link from "next/link";
import { getProjects } from "./actions";
import { MarketingRoom } from "./MarketingRoom";

export default async function MarketingPage() {
  const projects = await getProjects();

  return (
    <div className="min-h-screen bg-[#05060a] p-6 text-white sm:p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/studio"
          className="text-sm text-white/60 hover:text-white"
        >
          ← Studio
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Marketing Office</h1>
        <p className="mt-2 text-sm text-white/60">Content and campaigns. Generate captions and save as drafts.</p>
        <MarketingRoom projects={projects} />
      </div>
    </div>
  );
}
