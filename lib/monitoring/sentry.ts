/**
 * Production error monitoring — no-ops unless SENTRY_DSN is set.
 */
import * as Sentry from "@sentry/nextjs";

let initialized = false;

export function initMonitoring(): void {
  if (initialized) return;
  const dsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.05") || 0.05,
    // Avoid capturing local noise when DSN is accidentally set in .env.local
    enabled: process.env.NODE_ENV === "production" || process.env.SENTRY_ENABLE === "1",
  });
  initialized = true;
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) {
    console.error(error, context);
    return;
  }
  Sentry.withScope((scope) => {
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value);
      }
    }
    Sentry.captureException(error);
  });
}
