import { redirect } from "next/navigation";
import { hasAdminAccess } from "@/lib/admin-auth";
import { getEmailProviderStatus } from "@/lib/integrations/emailProvider";
import SettingsClient from "./settings-client";

export const metadata = {
  title: "Settings · Admin · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const isAdmin = await hasAdminAccess();
  if (!isAdmin) redirect("/admin/login");

  const env = {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    DIRECT_URL: Boolean(process.env.DIRECT_URL),
    NEXT_PUBLIC_SITE_URL: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
    OPENAI_API_KEY: Boolean(process.env.OPENAI_API_KEY),
    AUTOMATION_API_SECRET: Boolean(process.env.AUTOMATION_API_SECRET),
    BL_INTERNAL_API_TOKEN: Boolean(process.env.BL_INTERNAL_API_TOKEN),
  };

  const emailStatus = getEmailProviderStatus();

  return (
    <SettingsClient
      env={env}
      emailStatus={{
        provider: emailStatus.provider,
        configured: emailStatus.configured,
        emailAddress: emailStatus.emailAddress,
        displayName: emailStatus.displayName,
        missing: emailStatus.missing,
      }}
    />
  );
}

