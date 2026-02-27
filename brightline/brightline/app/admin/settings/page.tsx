import { redirect } from "next/navigation";

export const metadata = {
  title: "Settings · Admin · Bright Line Photography",
  robots: { index: false, follow: false },
};

export default function AdminSettingsPage() {
  redirect("/admin");
}
