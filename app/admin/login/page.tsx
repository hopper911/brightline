import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Admin Login · BRIGHTLINE Photography",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <h1 className="font-display text-2xl text-white">Admin Login</h1>
      <p className="mt-2 text-sm text-white/70">
        Enter your access code to continue.
      </p>
      <Suspense
        fallback={
          <p className="mt-6 text-sm text-white/50" role="status">
            Loading…
          </p>
        }
      >
        <LoginForm className="mt-6" />
      </Suspense>
    </div>
  );
}
