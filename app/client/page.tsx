import Link from "next/link";

export const metadata = {
  title: "Client Access · Bright Line Photography",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ClientAccessPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.35em] text-black/50">
        Client Access
      </p>
      <h1 className="font-display mt-4 text-4xl text-black">
        Private galleries by request.
      </h1>
      <p className="mt-3 text-base text-black/70">
        If you need access, contact the studio for your private link.
      </p>
      <Link
        href="/contact"
        className="mt-8 rounded-full border border-black/20 px-6 py-3 text-xs uppercase tracking-[0.32em] text-black/70"
      >
        Contact the studio
      </Link>
    </div>
  );
}
