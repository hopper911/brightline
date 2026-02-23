"use client";

import { signOut } from "next-auth/react";

export default function AdminLogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="btn btn-ghost text-black/60 hover:text-black"
    >
      Sign out
    </button>
  );
}
