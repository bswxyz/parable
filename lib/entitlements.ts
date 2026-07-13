import type { Tier } from "@/lib/catalog";
import { PAYMENTS_ENABLED } from "@/lib/flags";

export interface User {
  id: string;
  email: string;
  plan: "free" | "pro";
}

export interface Entitlement {
  userId: string;
  slug: string;
  itemType: "component" | "template";
}

export interface AccessItem {
  slug: string;
  tier: Tier;
}

/**
 * The single gate for whether a user can access a catalog item.
 *
 * STUBBED OPEN: while `PAYMENTS_ENABLED` is false, this always returns true —
 * every component and template is free. The gating logic below is the shape a
 * production version takes once a Pro tier goes live; it just never runs today.
 */
export function canAccess(
  item: AccessItem,
  user?: User | null,
  entitlements: Entitlement[] = []
): boolean {
  if (!PAYMENTS_ENABLED) return true; // launch state: everything unlocked
  if (item.tier === "free") return true;
  if (!user) return false;
  if (user.plan === "pro") return true;
  return entitlements.some((e) => e.slug === item.slug);
}
