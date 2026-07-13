"use client";

import * as React from "react";
import {
  motion,
  useReducedMotion,
  type TargetAndTransition,
  type Transition,
} from "motion/react";
import { cn } from "@/lib/utils";

/** Round a float to 3 decimals — full-precision floats trip React hydration. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Clamp `n` into the inclusive `[lo, hi]` range. */
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/**
 * Inject a `<style>` carrying `css` exactly once per `id`, shared across every
 * instance on the page. SSR-safe: `document` is only touched inside an effect,
 * never during render, so the server markup and the first client paint agree.
 */
function useInjectedKeyframes(id: string, css: string): void {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
    // Intentionally not removed on unmount — the rule is shared and idempotent.
  }, [id, css]);
}

const KEYFRAME_ID = "pb-wallet-stack-kf";
const SHEEN_KEYFRAMES = `
@keyframes pb-wallet-stack-sheen {
  0%   { transform: translateX(-140%) skewX(-16deg); opacity: 0; }
  12%  { opacity: 0.5; }
  40%  { opacity: 0; }
  100% { transform: translateX(360%) skewX(-16deg); opacity: 0; }
}`;

/**
 * Brand-palette gradient pairs used when a card omits its own `gradient`.
 * Mirrors the site `--pb-*` tokens: violet #8b5cf6, fuchsia #ec4899,
 * ember #f5a623, signal #22d3ee.
 */
const DEFAULT_GRADIENTS: ReadonlyArray<readonly [string, string]> = [
  ["#8b5cf6", "#ec4899"], // violet  -> fuchsia
  ["#22d3ee", "#8b5cf6"], // signal  -> violet
  ["#f5a623", "#ec4899"], // ember   -> fuchsia
  ["#ec4899", "#8b5cf6"], // fuchsia -> violet
  ["#22d3ee", "#f5a623"], // signal  -> ember
];

// Stack geometry. Deeper cards rise (negative y) and shrink; the front card
// sits at rest (y 0, scale 1). LIFT is how far the cycling card dips toward the
// viewer before it tucks to the back.
const GAP = 16;
const SCALE_STEP = 0.05;
const LIFT = 56;
const ASPECT = 1.586; // ISO/IEC 7810 ID-1 credit-card ratio (85.6 / 53.98).

export interface WalletCard {
  /** Stable unique identity — drives stack order and motion tracking. */
  id: string;
  /** Short tag shown top-left, e.g. `"Personal"`. */
  label: string;
  /** Masked number row, e.g. `"•••• 4242"`. */
  number?: string;
  /** Cardholder line, e.g. `"A. MORGAN"`. */
  holder?: string;
  /** Face gradient `[from, to]`. Defaults to a brand-palette pair. */
  gradient?: [string, string];
}

export interface WalletStackProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Cards, front-to-back. Three to five read best; any length is handled. */
  cards: WalletCard[];
  /** Fires with the new front card's `id` after each cycle. */
  onFrontChange?: (id: string) => void;
  className?: string;
}

/**
 * WalletStack — a Family-wallet-style deck of credit-card faces. Three to five
 * gradient cards sit in a stack, deeper ones rising and shrinking behind the
 * front; clicking the stack (or pressing Enter/Space, since the whole deck is a
 * real `button`) cycles the front card to the back with a spring-timed
 * lift-and-tuck — it dips toward the viewer, keeps its z-order on top through
 * the arc, then drops behind as the rest advance one place forward. Each face
 * carries a mono number row (`•••• 4242`), a holder line, a chip and a small
 * brand dot, with an ambient sheen sweeping the front card. Layout is derived
 * deterministically from the card order (no `Math.random()` in render) so the
 * server and first client paint match, and an `aria-live` region announces the
 * new front card on every cycle. Under `prefers-reduced-motion` the stack
 * reorders instantly with no lift and no sheen, leaving a static, fully legible
 * deck.
 *
 * Default gradients mirror the site's `--pb-*` tokens: violet #8b5cf6,
 * fuchsia #ec4899, ember #f5a623, signal #22d3ee on ink #0f0f10.
 *
 * @parable/wallet-stack
 */
export function WalletStack({
  cards,
  onFrontChange,
  className,
  ...props
}: WalletStackProps) {
  const reduce = useReducedMotion();
  useInjectedKeyframes(KEYFRAME_ID, SHEEN_KEYFRAMES);

  const idsKey = cards.map((c) => c.id).join("|");
  const [order, setOrder] = React.useState<string[]>(() =>
    cards.map((c) => c.id)
  );
  const [cyclingId, setCyclingId] = React.useState<string | null>(null);

  // Re-sync the internal order if the caller swaps the card set (by id). Same
  // ids across renders keep `idsKey` stable, so a cycled order is preserved.
  React.useEffect(() => {
    setOrder(cards.map((c) => c.id));
    setCyclingId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const cycle = React.useCallback(() => {
    if (order.length < 2) return;
    if (!reduce && cyclingId) return; // one flick at a time
    const oldFront = order[0];
    const next = [...order.slice(1), oldFront];
    setOrder(next);
    onFrontChange?.(next[0]);
    if (!reduce) setCyclingId(oldFront);
  }, [order, cyclingId, reduce, onFrontChange]);

  const n = cards.length;
  const peekRoom = Math.max(0, (n - 1) * GAP);

  const frontCard = React.useMemo(
    () => cards.find((c) => c.id === order[0]),
    [cards, order]
  );
  const announce = frontCard ? `${frontCard.label}, front card of ${n}` : "";

  return (
    <div className={cn("w-full max-w-[340px]", className)} {...props}>
      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>

      <button
        type="button"
        onClick={cycle}
        aria-label={`Card stack, ${n} cards. Activate to bring the next card to the front.`}
        className={cn(
          "group relative block w-full cursor-pointer select-none rounded-[1.4rem] outline-none",
          "transition-transform duration-200 active:scale-[0.99]",
          "focus-visible:ring-2 focus-visible:ring-[#8b5cf6] focus-visible:ring-offset-2",
          "focus-visible:ring-offset-transparent"
        )}
        style={{ paddingTop: peekRoom + 10, paddingBottom: LIFT + 10 }}
      >
        <div aria-hidden className="relative mx-auto w-full">
          {/* Invisible sizer establishes the card box the faces overlay. */}
          <div className="invisible w-full" style={{ aspectRatio: String(ASPECT) }} />

          {cards.map((card, i) => {
            const d = Math.max(0, order.indexOf(card.id));
            const isCycling = card.id === cyclingId;
            const depthY = r3(-d * GAP);
            const depthScale = r3(1 - d * SCALE_STEP);
            const overlay = r3(clamp(d * 0.16, 0, 0.55));
            const grad =
              card.gradient ?? DEFAULT_GRADIENTS[i % DEFAULT_GRADIENTS.length];

            const transition: Transition = reduce
              ? { duration: 0 }
              : isCycling
                ? { duration: 0.6, ease: [0.22, 1, 0.36, 1], times: [0, 0.42, 1] }
                : { type: "spring", stiffness: 220, damping: 24 };

            const animate: TargetAndTransition =
              !reduce && isCycling
                ? {
                    y: [0, LIFT, depthY],
                    scale: [1, 1.06, depthScale],
                    rotate: [0, -3, 0],
                  }
                : { y: depthY, scale: depthScale, rotate: 0 };

            const scrimTransition: Transition = reduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 220, damping: 24 };

            return (
              <motion.div
                key={card.id}
                initial={{ y: depthY, scale: depthScale, rotate: 0 }}
                animate={animate}
                transition={transition}
                onAnimationComplete={() => {
                  if (card.id === cyclingId) setCyclingId(null);
                }}
                style={{
                  zIndex: isCycling ? n + 10 : n - d,
                  transformOrigin: "50% 50%",
                  willChange: "transform",
                }}
                className="absolute inset-0"
              >
                <div
                  className={cn(
                    "relative h-full w-full overflow-hidden rounded-[1.1rem] ring-1 ring-white/15",
                    "shadow-[0_18px_40px_-18px_rgba(0,0,0,0.65)]"
                  )}
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`,
                  }}
                >
                  {/* Ambient sheen — front card only, off under reduced motion. */}
                  {!reduce && d === 0 && (
                    <span
                      aria-hidden
                      className={cn(
                        "pointer-events-none absolute inset-y-0 left-0 w-1/3",
                        "bg-gradient-to-r from-transparent via-white/45 to-transparent",
                        "mix-blend-overlay",
                        "[animation:pb-wallet-stack-sheen_5.5s_ease-in-out_infinite]"
                      )}
                    />
                  )}

                  {/* Depth scrim — darkens cards as they recede. */}
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-black"
                    initial={{ opacity: overlay }}
                    animate={{ opacity: overlay }}
                    transition={scrimTransition}
                  />

                  {/* Card face. */}
                  <div className="relative flex h-full w-full flex-col justify-between p-5 text-white">
                    <div className="flex items-start justify-between">
                      <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium tracking-wide backdrop-blur-sm">
                        {card.label}
                      </span>
                      <span className="mt-0.5 size-3.5 rounded-full bg-white/85 ring-2 ring-white/25" />
                    </div>

                    <div className="h-7 w-10 rounded-md bg-gradient-to-br from-amber-200/90 to-amber-500/80 ring-1 ring-black/10">
                      <div className="mx-auto mt-2 h-3 w-6 rounded-[3px] border border-black/15" />
                    </div>

                    <div className="space-y-1.5">
                      <div className="font-mono text-lg tracking-[0.18em] text-white/95">
                        {card.number ?? "•••• ••••"}
                      </div>
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-white/70">
                        <span className="truncate">{card.holder ?? ""}</span>
                        <span className="tabular-nums">••/••</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </button>
    </div>
  );
}

export default WalletStack;
