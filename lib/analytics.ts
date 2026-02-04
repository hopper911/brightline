type EventProps = Record<string, string | number | boolean | null | undefined>;

function trackEvent(event: string, props?: EventProps) {
  if (typeof window === "undefined") return;
  const win = window as typeof window & {
    plausible?: (eventName: string, options?: { props?: EventProps }) => void;
    gtag?: (...args: unknown[]) => void;
  };

  if (win.plausible) {
    win.plausible(event, props ? { props } : undefined);
  }
  if (win.gtag) {
    win.gtag("event", event, props || {});
  }
}

export function trackCTAClick({
  label,
  location,
  service,
}: {
  label?: string;
  location?: string;
  service?: string;
}) {
  trackEvent("cta_click", { label, location, service });
}

export function trackBookingClick(location?: string) {
  trackEvent("booking_click", { location });
}

export function trackContactSubmit({
  service,
  type,
}: {
  service?: string;
  type?: string;
} = {}) {
  trackEvent("contact_submit", { service, type });
}

export function trackPortfolioView({
  slug,
  category,
}: {
  slug?: string;
  category?: string;
} = {}) {
  trackEvent("portfolio_view", { slug, category });
}
/**
 * Analytics utilities for event tracking
 * Supports Plausible, Google Analytics, and custom backends
 */

type EventName =
  | "cta_click"
  | "contact_submit"
  | "portfolio_view"
  | "gallery_access"
  | "download"
  | "favorite"
  | "booking_click"
  | "service_view";

type EventProperties = Record<string, string | number | boolean>;

/**
 * Track a custom event
 */
export function trackEvent(name: EventName, properties?: EventProperties) {
  // Plausible Analytics
  if (typeof window !== "undefined" && "plausible" in window) {
    (window as Window & { plausible?: (name: string, options?: { props?: EventProperties }) => void }).plausible?.(name, { props: properties });
  }

  // Google Analytics 4
  if (typeof window !== "undefined" && "gtag" in window) {
    (window as Window & { gtag?: (...args: unknown[]) => void }).gtag?.("event", name, properties);
  }

  // Log in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[Analytics] ${name}`, properties);
  }
}

/**
 * Track CTA clicks with context
 */
export function trackCTAClick(options: {
  label: string;
  location: string;
  service?: string;
}) {
  trackEvent("cta_click", {
    label: options.label,
    location: options.location,
    service: options.service || "general",
  });
}

/**
 * Track contact form submissions
 */
export function trackContactSubmit(options: {
  type: "inquiry" | "availability";
  service?: string;
}) {
  trackEvent("contact_submit", {
    type: options.type,
    service: options.service || "general",
  });
}

/**
 * Track portfolio/project views
 */
export function trackPortfolioView(options: {
  slug: string;
  category: string;
  title: string;
}) {
  trackEvent("portfolio_view", {
    slug: options.slug,
    category: options.category,
    title: options.title,
  });
}

/**
 * Track service page views
 */
export function trackServiceView(options: {
  slug: string;
  title: string;
}) {
  trackEvent("service_view", {
    slug: options.slug,
    title: options.title,
  });
}

/**
 * Track booking button clicks
 */
export function trackBookingClick(location: string) {
  trackEvent("booking_click", { location });
}

/**
 * Track gallery access
 */
export function trackGalleryAccess(galleryId: string) {
  trackEvent("gallery_access", { gallery_id: galleryId });
}

/**
 * Track downloads
 */
export function trackDownload(options: {
  type: "single" | "favorites" | "bulk";
  galleryId?: string;
}) {
  trackEvent("download", {
    type: options.type,
    gallery_id: options.galleryId || "",
  });
}

/**
 * Track favorites
 */
export function trackFavorite(options: {
  action: "add" | "remove";
  galleryId: string;
}) {
  trackEvent("favorite", {
    action: options.action,
    gallery_id: options.galleryId,
  });
}
