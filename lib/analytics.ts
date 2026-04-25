/** Track contact form submission (Plausible/analytics) */
export function trackContactSubmit(_payload: {
  type?: string;
  service?: string;
}) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { plausible?: (a: string, b?: object) => void };
  if (w.plausible) {
    w.plausible("Contact Submit", { props: _payload });
  }
}

/** Track booking/CTA click (Plausible/analytics) */
export function trackBookingClick(location?: string) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { plausible?: (a: string, b?: object) => void };
  if (w.plausible) {
    w.plausible("Booking Click", { props: { location: location ?? "unknown" } });
  }
}
