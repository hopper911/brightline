import ClientAccessForm from "@/components/ClientAccessForm";

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
      <p className="text-xs uppercase tracking-[0.35em] text-mute">
        Client Access
      </p>
      <h1 className="section-title mt-4">
        Enter your access code.
      </h1>
      <p className="section-subtitle">
        Use the private code provided by Bright Line to view your gallery.
      </p>

      <ClientAccessForm />
    </div>
  );
}
