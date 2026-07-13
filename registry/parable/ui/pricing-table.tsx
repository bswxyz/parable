"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  type Transition,
} from "motion/react";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Parse "#rgb" / "#rrggbb" into an `rgba()` string; falls back to violet. */
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = Number.parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return `rgba(139, 92, 246, ${alpha})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Group an integer with thousands separators — deterministic, SSR-safe. */
function formatInt(n: number): string {
  const rounded = Math.round(n);
  const neg = rounded < 0;
  const body = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return neg ? `-${body}` : body;
}

/** Inject one shared <style> tag (id-guarded) that owns this component's keyframes. */
function useInjectedKeyframes(id: string, css: string): void {
  React.useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/* A stylesheet `!important` rule beats a normal inline style, so the media
   query below neutralises the inline `animation` under reduced motion. */
const KEYFRAMES = `
@keyframes pb-pricing-table-glow {
  0%, 100% { opacity: 0.4; transform: scale(0.98); }
  50% { opacity: 0.7; transform: scale(1.03); }
}
@media (prefers-reduced-motion: reduce) {
  [data-pb-pricing-glow] { animation: none !important; opacity: 0.5 !important; transform: none !important; }
}
`;

/**
 * The price digits, spring-eased between the monthly and yearly figures. The
 * settled figure is exposed to assistive tech via the parent's `aria-label`;
 * these digits are decorative so a screen reader never hears mid-tween noise.
 */
function AnimatedPrice({
  value,
  reduce,
}: {
  value: number;
  reduce: boolean;
}) {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 190, damping: 24, mass: 1 });
  const [display, setDisplay] = React.useState(value);

  React.useEffect(() => {
    mv.set(value);
  }, [mv, value]);

  React.useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const unsub = spring.on("change", (v) => setDisplay(v));
    return () => unsub();
  }, [spring, reduce, value]);

  return (
    <span aria-hidden className="tabular-nums">
      {formatInt(reduce ? value : display)}
    </span>
  );
}

export type BillingCycle = "monthly" | "yearly";

export interface PricingTier {
  /** Plan name — also the value passed to `onSelect`. */
  name: string;
  /** Price for one month of the monthly plan. */
  monthly: number;
  /** Price for the yearly plan (billed once per year). */
  yearly: number;
  /** Bullet-point features, shown with check icons. */
  features: string[];
  /** Marks the highlighted tier (accent border, glow, scale). */
  popular?: boolean;
  /** Call-to-action label. Defaults to "Get started". */
  cta?: string;
}

export interface PricingTableProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** The plans to render, left to right. */
  tiers: PricingTier[];
  /** Which cycle is active on first paint. */
  defaultCycle?: BillingCycle;
  /** Currency symbol prefixed to every price. */
  currency?: string;
  /** Accent for the popular tier, switch, and check icons. Mirrors `--pb-violet`. */
  accent?: string;
  /** Fires with a tier's `name` when its CTA is pressed. */
  onSelect?: (name: string) => void;
}

/**
 * PricingTable — a three-tier pricing block with a real billing switch. The
 * monthly/yearly toggle is a keyboard-operable `role="switch"`; flipping it
 * spring-tweens every price between its two figures and lights a "save" badge
 * computed from the largest annual discount in the set. One tier can be marked
 * `popular` for an accent border, a softly pulsing glow, and a slight scale-up
 * on wide screens. Cards stack on narrow viewports and sit in a row on wide
 * ones, each an equal-height column with its CTA pinned to the bottom.
 *
 * Fully accessible: the switch carries `aria-checked`, each price exposes its
 * settled value through an `aria-label` while the tweening digits stay
 * `aria-hidden`, feature lists use list semantics, and every control has a
 * `:focus-visible` ring. Under `prefers-reduced-motion` prices snap instantly,
 * the knob jumps, and the glow holds a static frame.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (accent = violet #8b5cf6).
 *
 * @parable/pricing-table
 */
export function PricingTable({
  tiers,
  defaultCycle = "monthly",
  currency = "$",
  accent = "#8b5cf6",
  onSelect,
  className,
  style,
  ...props
}: PricingTableProps) {
  useInjectedKeyframes("pb-pricing-table-kf", KEYFRAMES);
  const reduce = useReducedMotion() ?? false;

  const [cycle, setCycle] = React.useState<BillingCycle>(defaultCycle);
  const yearly = cycle === "yearly";

  const reactId = React.useId();
  const switchLabelId = `pb-pt-cycle-${reactId}`;

  const maxSave = React.useMemo(() => {
    let best = 0;
    for (const t of tiers) {
      const full = t.monthly * 12;
      if (t.monthly > 0 && t.yearly < full) {
        const pct = Math.round((1 - t.yearly / full) * 100);
        if (pct > best) best = pct;
      }
    }
    return best;
  }, [tiers]);

  const knobSpring: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 260, damping: 24 };

  const rootStyle = {
    "--pb-pt-accent": accent,
    "--pb-pt-glow": hexToRgba(accent, 0.55),
    ...style,
  } as React.CSSProperties;

  return (
    <div
      className={cn("w-full text-white", className)}
      style={rootStyle}
      {...props}
    >
      {/* Billing switch */}
      <div className="mb-9 flex flex-wrap items-center justify-center gap-3">
        <span
          id={switchLabelId}
          data-active={!yearly}
          className="text-sm font-medium text-white/45 transition-colors data-[active=true]:text-white"
        >
          Monthly
        </span>

        <button
          type="button"
          role="switch"
          aria-checked={yearly}
          aria-labelledby={switchLabelId}
          data-on={yearly}
          onClick={() => setCycle((c) => (c === "yearly" ? "monthly" : "yearly"))}
          className={cn(
            "relative inline-flex h-7 w-[3.25rem] shrink-0 items-center rounded-full p-0.5",
            "cursor-pointer bg-white/15 outline-none transition-colors duration-200",
            "data-[on=true]:bg-[var(--pb-pt-accent)]",
            "focus-visible:ring-2 focus-visible:ring-[var(--pb-pt-accent)]",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          )}
        >
          <motion.span
            aria-hidden
            className="size-6 rounded-full bg-white shadow-sm"
            animate={{ x: yearly ? 24 : 0 }}
            transition={knobSpring}
          />
        </button>

        <span
          data-active={yearly}
          className="flex items-center gap-2 text-sm font-medium text-white/45 transition-colors data-[active=true]:text-white"
        >
          Yearly
          {maxSave > 0 && (
            <span
              data-on={yearly}
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold leading-none",
                "bg-white/10 text-white/60 transition-colors duration-200",
                "data-[on=true]:bg-[var(--pb-pt-accent)]/20 data-[on=true]:text-[var(--pb-pt-accent)]"
              )}
            >
              Save {maxSave}%
            </span>
          )}
        </span>
      </div>

      {/* Tiers */}
      <ul
        role="list"
        className="grid list-none gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {tiers.map((tier) => {
          const price = yearly ? tier.yearly : tier.monthly;
          const popular = tier.popular ?? false;
          const priceLabel = `${currency}${formatInt(price)} ${
            yearly ? "per year" : "per month"
          }`;

          return (
            <li
              key={tier.name}
              className={cn("relative", popular && "lg:z-10")}
            >
              {popular && (
                <span
                  aria-hidden
                  data-pb-pricing-glow
                  className="pointer-events-none absolute -inset-3 rounded-[2rem] blur-2xl"
                  style={{
                    background:
                      "radial-gradient(60% 60% at 50% 0%, var(--pb-pt-glow), transparent 72%)",
                    animation: "pb-pricing-table-glow 5s ease-in-out infinite",
                  }}
                />
              )}

              <div
                className={cn(
                  "relative flex h-full flex-col rounded-2xl border p-6 backdrop-blur-sm",
                  "transition-colors duration-300",
                  popular
                    ? "border-[var(--pb-pt-accent)]/50 bg-white/[0.045] ring-1 ring-[var(--pb-pt-accent)]/30 lg:scale-105"
                    : "border-white/10 bg-white/[0.02]"
                )}
              >
                {popular && (
                  <span
                    className={cn(
                      "absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1",
                      "rounded-full bg-[var(--pb-pt-accent)] px-3 py-1 text-xs font-semibold text-white shadow-lg"
                    )}
                  >
                    <Sparkles className="size-3.5" aria-hidden strokeWidth={2.5} />
                    Most popular
                  </span>
                )}

                <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
                  {tier.name}
                </h3>

                <p
                  className="mt-4 flex items-baseline gap-1 text-white"
                  aria-label={priceLabel}
                >
                  <span aria-hidden className="text-2xl font-medium text-white/60">
                    {currency}
                  </span>
                  <span aria-hidden className="text-5xl font-semibold tracking-tight">
                    <AnimatedPrice value={price} reduce={reduce} />
                  </span>
                  <span aria-hidden className="text-sm font-medium text-white/45">
                    {yearly ? "/yr" : "/mo"}
                  </span>
                </p>

                <p className="mt-1 text-xs text-white/45">
                  {yearly ? "billed annually" : "billed monthly"}
                </p>

                <ul role="list" className="mt-6 flex-1 space-y-3">
                  {tier.features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm text-white/70"
                    >
                      <Check
                        aria-hidden
                        strokeWidth={2.5}
                        className="mt-0.5 size-4 shrink-0 text-[var(--pb-pt-accent)]"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => onSelect?.(tier.name)}
                  className={cn(
                    "mt-8 w-full rounded-xl px-4 py-2.5 text-sm font-semibold",
                    "cursor-pointer outline-none transition-[transform,background-color,filter] duration-200",
                    "active:scale-[0.98]",
                    "focus-visible:ring-2 focus-visible:ring-[var(--pb-pt-accent)]",
                    "focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
                    popular
                      ? "bg-[var(--pb-pt-accent)] text-white hover:brightness-110"
                      : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                  )}
                >
                  {tier.cta ?? "Get started"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default PricingTable;
