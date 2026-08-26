"use client";

export function AccountantLogoutButton() {
  return (
    <button
      type="button"
      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs uppercase tracking-wider text-white/70 hover:border-white/30 hover:text-white"
      onClick={async () => {
        await fetch("/api/accountant/logout", { method: "POST" });
        window.location.href = "/accountant/login";
      }}
    >
      Log out
    </button>
  );
}
