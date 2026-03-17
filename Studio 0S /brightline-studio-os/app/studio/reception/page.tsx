import Link from "next/link";
import { ReceptionRoom } from "./ReceptionRoom";

export default function ReceptionPage() {
  return (
    <div className="min-h-screen bg-[#05060a] p-6 text-white sm:p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/studio"
          className="text-sm text-white/60 hover:text-white"
        >
          ← Studio
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Reception</h1>
        <p className="mt-2 text-sm text-white/60">Leads and intake. Analyze inquiries and log events.</p>
        <ReceptionRoom />
      </div>
    </div>
  );
}
