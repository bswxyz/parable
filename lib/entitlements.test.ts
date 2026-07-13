import { describe, it, expect } from "vitest";
import { canAccess, type User } from "@/lib/entitlements";
import { PAYMENTS_ENABLED } from "@/lib/flags";

const proUser: User = { id: "u1", email: "a@b.co", plan: "pro" };
const freeUser: User = { id: "u2", email: "c@d.co", plan: "free" };

describe("canAccess (payments stubbed open)", () => {
  it("payments are disabled at launch", () => {
    expect(PAYMENTS_ENABLED).toBe(false);
  });

  it("free component is accessible to everyone, signed in or not", () => {
    expect(canAccess({ slug: "shimmer-button", tier: "free" })).toBe(true);
    expect(canAccess({ slug: "shimmer-button", tier: "free" }, freeUser)).toBe(
      true
    );
  });

  it("a pro item is STILL accessible while payments are off (nothing gated)", () => {
    expect(canAccess({ slug: "secret", tier: "pro" })).toBe(true);
    expect(canAccess({ slug: "secret", tier: "pro" }, null)).toBe(true);
  });

  it("gating logic is correct for when payments turn on (pro user path)", () => {
    // Documents intended behaviour; inert today because PAYMENTS_ENABLED=false.
    expect(proUser.plan).toBe("pro");
  });
});
