"use client";

import { signOut } from "next-auth/react";

export default function AdminLogoutButton() {
  return (
    <button
      type="button"
      className="btn btn-ghost"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
    >
      Log out
    </button>
  );
}
