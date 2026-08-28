import Link from "next/link";
import {
  canReadBrightlineStudioContent,
  canReadMirotechStudioContent,
} from "@/lib/studio/access";
import { resolveStudioOpsContext } from "@/lib/studio/ops/resolve-context";

export default async function StudioContentHomePage() {
  const context = await resolveStudioOpsContext();
  if (!context) return null;

  const legacyAdmin = context.subjectKind === "legacy_admin";
  const brightline = canReadBrightlineStudioContent(context.permissions, legacyAdmin);
  const mirotech = canReadMirotechStudioContent(context.permissions, legacyAdmin);

  return (
    <div>
      <h2 className="font-display text-2xl text-white">Content</h2>
      <p className="mt-2 max-w-2xl text-sm text-white/60">
        Read-only listings from ContentService. Editing stays in existing admin tools.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {brightline ? (
          <Link
            href="/studio/content/brightline"
            className="block rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 transition hover:border-white/25"
          >
            <p className="text-lg text-white">Brightline</p>
            <p className="mt-1 text-sm text-white/55">Work projects and portfolio projects</p>
          </Link>
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/20 px-5 py-4 text-sm text-white/45">
            Brightline content — permission required
          </div>
        )}
        {mirotech ? (
          <Link
            href="/studio/content/mirotech"
            className="block rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 transition hover:border-white/25"
          >
            <p className="text-lg text-white">MiroTech</p>
            <p className="mt-1 text-sm text-white/55">Hub projects and case studies</p>
          </Link>
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/20 px-5 py-4 text-sm text-white/45">
            MiroTech content — permission required
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-white/40">
        Active tenant: {context.activeTenant}. Tenant-specific views enforce PlatformContext routing.
      </p>
    </div>
  );
}
