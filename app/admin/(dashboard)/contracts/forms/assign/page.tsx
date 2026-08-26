import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import AssignFormClient from "./AssignFormClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Assign form · Admin",
  robots: { index: false, follow: false },
};

export default async function AssignFormPage() {
  if (!(await hasAdminAccess())) redirect("/admin/login");
  const clients = await prisma.studioClient.findMany({
    where: { isActive: true },
    orderBy: { companyName: "asc" },
    select: { id: true, companyName: true },
    take: 500,
  });

  return (
    <Suspense fallback={<div className="p-16 text-white/60">Loading…</div>}>
      <AssignFormClient clients={clients} />
      <p className="mx-auto max-w-lg px-4 pb-16 text-center text-xs">
        <Link href="/admin/contracts/forms" className="text-white/50 hover:text-white">
          Back to forms
        </Link>
      </p>
    </Suspense>
  );
}
