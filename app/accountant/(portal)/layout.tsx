import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAccountantPortalContext } from "@/lib/accountant/auth";
import { AccountantLogoutButton } from "@/components/accountant/AccountantLogoutButton";
import { AccountantNav } from "@/components/accountant/AccountantNav";

export const dynamic = "force-dynamic";

export default async function AccountantPortalLayout({ children }: { children: ReactNode }) {
  const ctx = await getAccountantPortalContext();
  if (!ctx) redirect("/accountant/login");

  const who =
    ctx.kind === "owner" ? "Owner / admin session" : `Accountant · ${ctx.accountantAccess.email}`;

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-6 px-4 py-8 md:flex-row md:px-8">
      <aside className="flex w-full flex-shrink-0 flex-col md:w-52">
        <AccountantNav />
        <div className="mt-6 text-xs text-white/45">
          <p className="text-white/60">{who}</p>
          <div className="mt-3">
            <AccountantLogoutButton />
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
