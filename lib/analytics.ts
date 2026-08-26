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

function track(event: string, props?: Record<string, string>) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { plausible?: (a: string, b?: object) => void };
  if (w.plausible) w.plausible(event, props ? { props } : undefined);
}

export function trackDesignPageView() {
  track("design_page_view");
}

export function trackDigitalProjectView(slug: string) {
  track("digital_project_view", { slug });
}

export function trackResumeView() {
  track("resume_view");
}

export function trackDesignCtaClick(location: string) {
  track("design_cta_click", { location });
}
