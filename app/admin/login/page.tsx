import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Admin Login · Bright Line Photography",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 py-16">
      <p className="text-xs uppercase tracking-[0.35em] text-black/50">
        Admin
      </p>
      <h1 className="font-display text-3xl text-black mt-2">
        Sign in
      </h1>
      <LoginForm />
    </div>
  );
}
