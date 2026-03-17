import Link from "next/link";
import { SettingsContent } from "./SettingsContent";

export const metadata = {
  title: "Settings | Bright Line Studio OS",
  description: "Local AI and studio preferences",
};

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-studio-bg p-6 text-white sm:p-8">
      <div className="mx-auto max-w-xl">
        <Link
          href="/studio"
          className="text-xs font-medium uppercase tracking-[0.1em] text-white/45 transition-colors hover:text-white/70"
        >
          ← Studio
        </Link>
        <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-white/95 sm:text-[1.75rem]">
          Settings
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Local AI and studio preferences. No authentication required.
        </p>
        <SettingsContent />
      </div>
    </div>
  );
}
