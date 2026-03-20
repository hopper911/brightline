import Link from "next/link";
import { enableDemoMode } from "@/app/studio/demo/actions";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#05060a] flex flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold text-white">
        Bright Line Studio OS
      </h1>
      <p className="text-white/60 text-center max-w-md">
        Mission control for your photography studio.
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/studio"
          className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
        >
          Open Studio
        </Link>
        <Link
          href="/sign-in"
          className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
        >
          Sign in
        </Link>
        <form action={enableDemoMode}>
          <button
            type="submit"
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
          >
            View Demo Studio
          </button>
        </form>
      </div>
    </main>
  );
}
