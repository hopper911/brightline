/**
 * Server-only Stripe configuration checks. Never import this from client components.
 */

export const STRIPE_NOT_CONFIGURED_MESSAGE =
  "Stripe is not configured. Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET.";

export function assertStripeSecretKey(): void {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    throw new Error(STRIPE_NOT_CONFIGURED_MESSAGE);
  }
}

/**
 * Webhook signature verification uses the Stripe SDK instance; both keys must be present
 * for production webhook handling.
 */
export function assertStripeWebhookEnv(): void {
  if (!process.env.STRIPE_SECRET_KEY?.trim() || !process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    throw new Error(STRIPE_NOT_CONFIGURED_MESSAGE);
  }
}

/**
 * Checkout success/cancel URLs must use the public site URL (never a client-provided host).
 */
export function getCheckoutSiteBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (!u) {
    throw new Error(
      "Stripe checkout requires NEXT_PUBLIC_SITE_URL (e.g. https://yourdomain.com).",
    );
  }
  return u;
}
