/**
 * Feature flags. Payments/auth are wired but OFF at launch — everything is free.
 * Flip AUTH_ENABLED (env NEXT_PUBLIC_AUTH_ENABLED=1) only once Supabase auth is
 * configured and a Pro tier is ready to go live.
 */
export const AUTH_ENABLED =
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "1" ||
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

/** Whether checkout/payments are live. Never true at launch. */
export const PAYMENTS_ENABLED = false;
