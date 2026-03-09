/** Track contact form submission (Plausible/analytics) */
export function trackContactSubmit(_payload: {
  type?: string;
  service?: string;
}) {
  if (typeof window !== "undefined" && (window as { plausible?: (a: string, b?: object) => void }).plausible) {
    (window as { plausible: (a: string, b?: object) => void }).plausible("Contact Submit", { props: _payload });
  }
}

/** Track booking/CTA click (Plausible/analytics) */
export function trackBookingClick(location?: string) {
  if (typeof window !== "undefined" && (window as { plausible?: (a: string, b?: object) => void }).plausible) {
    (window as { plausible: (a: string, b?: object) => void }).plausible("Booking Click", { props: { location: location ?? "unknown" } });
  }
}
