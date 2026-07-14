"use client";

import * as React from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type PanInfo,
} from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Inject a <style> block once per unique id (SSR-safe, idempotent). */
function useInjectedKeyframes(id: string, css: string) {
  React.useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/** Round to 3 decimals — full-precision floats in inline styles trip React 19
 * hydration checks, and these feed motion transforms. */
const r3 = (n: number): number => Math.round(n * 1000) / 1000;

/** Positive modulo, so wrapping the deck backwards never yields a negative slot. */
const mod = (n: number, m: number): number => ((n % m) + m) % m;

/** A one-shot instruction the parent fires at a single card. `token` is monotonic
 * so a card's throw/enter effect re-runs only for a genuinely new request — it is
 * never reset to an "off" state whose cleanup would cancel a settling animation. */
interface Signal {
  index: number;
  dir: 1 | -1;
  token: number;
}

const GEO = {
  /** Depths past this collapse onto a hidden buffer slot behind the deck. */
  maxVisible: 2,
  /** Per-depth downscale of cards further back. */
  scaleStep: 0.06,
  /** Per-depth upward peek (px) of cards further back. */
  yStep: 16,
  /** Per-depth opacity falloff of visible cards further back. */
  opacityStep: 0.16,
  /** Drag distance (px) mapped to the full ±rotate tilt. */
  rotRange: 190,
  /** Peak tilt (deg) at a full throw. */
  maxRotate: 13,
  /** Drag distance (px) over which a card fades toward transparent. */
  fadeRange: 380,
  /** Release offset (px) past which a flick dismisses the top card. */
  threshold: 92,
  /** Release velocity (px/s) past which a flick dismisses regardless of offset. */
  velThreshold: 460,
  /** Spring for the depth reshuffle (scale / y / opacity). */
  layoutSpring: { type: "spring", stiffness: 300, damping: 34 } as const,
} as const;

/** Vertical headroom the deck reserves at the top for back cards to peek into. */
const PEEK = GEO.maxVisible * GEO.yStep;

const KEYFRAMES =
  ".pb-ocs-hint-l{animation:pb-ocs-nudge-l 2.6s cubic-bezier(.22,1,.36,1) infinite}" +
  ".pb-ocs-hint-r{animation:pb-ocs-nudge-r 2.6s cubic-bezier(.22,1,.36,1) infinite}" +
  "@keyframes pb-ocs-nudge-l{0%,100%{opacity:.2;transform:translateX(0)}50%{opacity:.6;transform:translateX(-3px)}}" +
  "@keyframes pb-ocs-nudge-r{0%,100%{opacity:.2;transform:translateX(0)}50%{opacity:.6;transform:translateX(3px)}}" +
  "@media (prefers-reduced-motion:reduce){.pb-ocs-hint-l,.pb-ocs-hint-r{animation:none;opacity:.28}}";

interface OrbitCardProps {
  index: number;
  active: number;
  count: number;
  loop: boolean;
  reduced: boolean;
  accent: string;
  throwSig: Signal;
  enterSig: Signal;
  showHint: boolean;
  onInteract: () => void;
  onDismiss: (dir: 1 | -1) => void;
  onThrowResolved: () => void;
  onEnterResolved: () => void;
  children: React.ReactNode;
}

/**
 * One card in the deck. It owns its own `x` motion value plus derived `rotate`
 * and `fade`, so the parent never re-renders while a card is dragged or thrown —
 * the transforms run imperatively on the compositor. Depth (scale / y / opacity /
 * z) is a pure function of the shared `active` index, animated by a spring; the
 * throw and re-enter flings are driven off monotonic tokens so a settling card is
 * never interrupted by the next reshuffle. The per-card hooks live here (not in a
 * `.map` in the parent) to keep hook order stable as the deck grows or shrinks.
 */
function OrbitCard({
  index,
  active,
  count,
  loop,
  reduced,
  accent,
  throwSig,
  enterSig,
  showHint,
  onInteract,
  onDismiss,
  onThrowResolved,
  onEnterResolved,
  children,
}: OrbitCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(
    x,
    [-GEO.rotRange, 0, GEO.rotRange],
    [-GEO.maxRotate, 0, GEO.maxRotate]
  );
  const fade = useTransform(
    x,
    [
      -GEO.fadeRange,
      -GEO.fadeRange * 0.55,
      0,
      GEO.fadeRange * 0.55,
      GEO.fadeRange,
    ],
    [0.06, 0.55, 1, 0.55, 0.06]
  );

  const innerRef = React.useRef<HTMLDivElement | null>(null);
  const anims = React.useRef<ReturnType<typeof animate>[]>([]);
  const track = (a: ReturnType<typeof animate>) => {
    anims.current.push(a);
    return a;
  };
  // Stop any in-flight animation on unmount.
  React.useEffect(() => () => anims.current.forEach((a) => a.stop()), []);

  // While flying, keep this card above the deck so a flicked card reads as being
  // lifted off the top — then it drops behind for the return leg.
  const [flying, setFlying] = React.useState(false);

  // Throw: fling the card off-screen in `dir`, then curve it back to rest as it
  // rejoins the rear of the deck (invisible when a hidden buffer slot exists).
  React.useEffect(() => {
    if (reduced || throwSig.index !== index) return;
    let alive = true;
    setFlying(true);
    const w = innerRef.current?.offsetWidth ?? 320;
    const dist = throwSig.dir * (w * 1.15 + 48);
    const out = track(
      animate(x, dist, {
        type: "spring",
        stiffness: 300,
        damping: 26,
        restDelta: 1,
        restSpeed: 24,
      })
    );
    out.then(() => {
      onThrowResolved();
      if (!alive) return;
      setFlying(false);
      track(animate(x, 0, { type: "spring", stiffness: 170, damping: 24 }));
    });
    return () => {
      alive = false;
      out.stop();
    };
    // Re-runs only when a fresh throw token targets this card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [throwSig.token]);

  // Enter (previous): slide the returning card in from the side while its depth
  // spring lifts it back to the front — the mirror image of a throw.
  React.useEffect(() => {
    if (reduced || enterSig.index !== index) return;
    const w = innerRef.current?.offsetWidth ?? 320;
    x.set(enterSig.dir * (w * 1.1 + 48));
    const c = track(animate(x, 0, { type: "spring", stiffness: 240, damping: 26 }));
    c.then(() => onEnterResolved());
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enterSig.token]);

  // Depth 0 = front. Loop wraps; a finite deck lets already-dismissed cards fall
  // to a negative depth so they drop out instead of cycling round.
  const depth = loop ? mod(index - active, count) : index - active;
  const dismissed = !loop && depth < 0;

  let scale = 1;
  let y = 0;
  let opacity = 1;
  let z = count;
  if (dismissed) {
    scale = 0.9;
    opacity = 0;
    z = 0;
  } else {
    const d = Math.min(depth, GEO.maxVisible);
    scale = r3(1 - d * GEO.scaleStep);
    y = r3(-(d * GEO.yStep));
    opacity = depth > GEO.maxVisible ? 0 : r3(1 - d * GEO.opacityStep);
    z = count - depth;
  }
  const isFront = depth === 0 && !dismissed;
  const dragEnabled = isFront && !reduced && count > 1;

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    const off = info.offset.x;
    const vel = info.velocity.x;
    if (Math.abs(off) > GEO.threshold || Math.abs(vel) > GEO.velThreshold) {
      const dir = (off !== 0 ? Math.sign(off) : Math.sign(vel)) as 1 | -1;
      onDismiss(dir);
    } else {
      track(animate(x, 0, { type: "spring", stiffness: 340, damping: 30 }));
    }
  };

  return (
    <motion.div
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${count}`}
      aria-hidden={!isFront}
      className="absolute inset-x-0"
      style={{
        top: PEEK,
        height: `calc(100% - ${PEEK}px)`,
        zIndex: flying ? count + 30 : z,
        pointerEvents: isFront && !flying ? "auto" : "none",
      }}
      animate={{ scale, y, opacity }}
      transition={reduced ? { duration: 0 } : GEO.layoutSpring}
    >
      <motion.div
        ref={innerRef}
        drag={dragEnabled ? "x" : false}
        dragMomentum={false}
        onDragStart={onInteract}
        onDragEnd={handleDragEnd}
        style={{
          x,
          rotate,
          opacity: fade,
          touchAction: dragEnabled ? "pan-y" : undefined,
          willChange: "transform",
        }}
        className={cn(
          "h-full w-full",
          dragEnabled && "cursor-grab active:cursor-grabbing"
        )}
      >
        <div
          className={cn(
            "relative flex h-full w-full flex-col overflow-hidden rounded-2xl",
            "border border-white/10 bg-[linear-gradient(165deg,#1c1c21,#111113)]",
            "shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_24px_48px_-28px_rgba(0,0,0,0.9)]"
          )}
        >
          <div className="flex-1 overflow-hidden p-6">{children}</div>

          {isFront && showHint && (
            <>
              <ChevronLeft
                aria-hidden
                className="pb-ocs-hint-l pointer-events-none absolute left-2 top-1/2 size-5 -translate-y-1/2"
                style={{ color: accent }}
                strokeWidth={2.5}
              />
              <ChevronRight
                aria-hidden
                className="pb-ocs-hint-r pointer-events-none absolute right-2 top-1/2 size-5 -translate-y-1/2"
                style={{ color: accent }}
                strokeWidth={2.5}
              />
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export interface OrbitCardStackProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "children"> {
  /** Cards to stack, front-most first. Each is placed inside the deck surface. */
  cards: React.ReactNode[];
  /** Fires with the new front-card index whenever the deck advances or rewinds. */
  onChange?: (index: number) => void;
  /** Wrap at the ends — dismissing the last card returns to the first. Default true. */
  loop?: boolean;
  /**
   * Accent for the swipe hint, focus rings, and the active control. Defaults to
   * Parable violet `#8b5cf6` (mirrors the site's `--pb-violet` token).
   */
  accent?: string;
  /** Accessible name for the carousel region. */
  label?: string;
}

/**
 * OrbitCardStack — a draggable card deck (testimonials, photos, prompts). Cards
 * sit in a depth stack — each one further back scaled down, nudged up, and dimmed
 * — and the front card can be flung left or right to dismiss it to the back with a
 * spring throw: it lifts off the top, arcs off-screen with a velocity-projected
 * tilt, then curves back to rest as the deck springs forward. Previous / next
 * buttons and the arrow keys advance and rewind (a rewind mirrors the throw,
 * sliding the returning card in from the side). Real carousel semantics —
 * `role="group"` with `aria-roledescription="carousel"`, one exposed slide at a
 * time, a polite live region announcing position, and full keyboard operation
 * (arrows, Home / End). Under `prefers-reduced-motion` the deck reorders
 * instantly with no drag or throw physics, keeping the same controls and
 * labelling. The stage height is overridable via the `--pb-ocs-h` CSS variable
 * (default 340px).
 *
 * Colour defaults mirror the site's `--pb-*` tokens (accent = violet #8b5cf6 on
 * ink #0f0f10; card surfaces lean on fuchsia #ec4899 / ember #f5a623 / signal
 * #22d3ee when content supplies them).
 *
 * @parable/orbit-card-stack
 */
export function OrbitCardStack({
  cards,
  onChange,
  loop = true,
  accent = "#8b5cf6",
  label = "Card stack",
  className,
  style,
  ...rest
}: OrbitCardStackProps) {
  useInjectedKeyframes("pb-orbit-card-stack-kf", KEYFRAMES);

  const reduced = !!useReducedMotion();
  const count = cards.length;

  const [active, setActive] = React.useState(0);
  const activeRef = React.useRef(0);
  const busyRef = React.useRef(false);
  const [throwSig, setThrowSig] = React.useState<Signal>({
    index: -1,
    dir: 1,
    token: 0,
  });
  const [enterSig, setEnterSig] = React.useState<Signal>({
    index: -1,
    dir: 1,
    token: 0,
  });
  const [interacted, setInteracted] = React.useState(false);

  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const go = React.useCallback((na: number) => {
    activeRef.current = na;
    setActive(na);
    onChangeRef.current?.(na);
  }, []);

  // Keep the active index valid if the collection shrinks under it.
  React.useEffect(() => {
    if (count > 0 && activeRef.current > count - 1) go(count - 1);
  }, [count, go]);

  const next = React.useCallback(
    (dir: 1 | -1 = 1) => {
      if (count <= 1) return;
      const cur = activeRef.current;
      if (!loop && cur >= count - 1) return;
      const na = loop ? mod(cur + 1, count) : cur + 1;
      setInteracted(true);
      if (reduced) {
        go(na);
        return;
      }
      if (busyRef.current) return;
      busyRef.current = true;
      setThrowSig((s) => ({ index: cur, dir, token: s.token + 1 }));
      go(na);
    },
    [count, loop, reduced, go]
  );

  const prev = React.useCallback(
    (dir: 1 | -1 = 1) => {
      if (count <= 1) return;
      const cur = activeRef.current;
      if (!loop && cur <= 0) return;
      const na = loop ? mod(cur - 1, count) : cur - 1;
      setInteracted(true);
      if (reduced) {
        go(na);
        return;
      }
      if (busyRef.current) return;
      busyRef.current = true;
      go(na);
      setEnterSig((s) => ({ index: na, dir, token: s.token + 1 }));
    },
    [count, loop, reduced, go]
  );

  const onThrowResolved = React.useCallback(() => {
    busyRef.current = false;
  }, []);
  const onEnterResolved = React.useCallback(() => {
    busyRef.current = false;
  }, []);
  const onInteract = React.useCallback(() => setInteracted(true), []);
  const onDismiss = React.useCallback((dir: 1 | -1) => next(dir), [next]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        next(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        prev(1);
        break;
      case "Home":
        e.preventDefault();
        setInteracted(true);
        go(0);
        break;
      case "End":
        e.preventDefault();
        setInteracted(true);
        go(count - 1);
        break;
      default:
        break;
    }
  };

  const styleVars = {
    "--pb-ocs-accent": accent,
    ...style,
  } as React.CSSProperties;

  const focusRing =
    "outline-none focus-visible:ring-2 focus-visible:ring-[var(--pb-ocs-accent)] " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

  const showHint = !reduced && count > 1 && !interacted;
  const prevDisabled = count <= 1 || (!loop && active <= 0);
  const nextDisabled = count <= 1 || (!loop && active >= count - 1);

  if (count === 0) {
    return (
      <section
        {...rest}
        role="group"
        aria-roledescription="carousel"
        aria-label={label}
        className={cn("relative w-full max-w-sm", className)}
        style={styleVars}
      />
    );
  }

  return (
    <section
      {...rest}
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      className={cn("relative w-full max-w-sm select-none", className)}
      style={styleVars}
    >
      <div
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label="Card deck. Use the left and right arrow keys to browse."
        className={cn(
          "relative w-full overflow-hidden rounded-3xl",
          focusRing
        )}
        style={{ height: "var(--pb-ocs-h, 340px)" }}
      >
        {cards.map((card, i) => (
          <OrbitCard
            key={i}
            index={i}
            active={active}
            count={count}
            loop={loop}
            reduced={reduced}
            accent={accent}
            throwSig={throwSig}
            enterSig={enterSig}
            showHint={showHint}
            onInteract={onInteract}
            onDismiss={onDismiss}
            onThrowResolved={onThrowResolved}
            onEnterResolved={onEnterResolved}
          >
            {card}
          </OrbitCard>
        ))}
      </div>

      {/* Polite live region — announces position without stealing focus. */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {`Card ${active + 1} of ${count}`}
      </div>

      {count > 1 && (
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => prev(1)}
            disabled={prevDisabled}
            aria-label="Previous card"
            className={cn(
              "grid size-9 place-items-center rounded-full border border-white/10",
              "bg-white/[0.04] text-white/80 transition-[background-color,transform,opacity] duration-200",
              "hover:bg-white/[0.09] active:scale-95",
              "disabled:pointer-events-none disabled:opacity-30",
              focusRing
            )}
          >
            <ChevronLeft className="size-5" strokeWidth={2.25} />
          </button>

          <div
            aria-hidden
            className="min-w-[3.5rem] text-center text-xs font-medium tabular-nums text-white/55"
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            <span className="text-white/90">{active + 1}</span>
            <span className="px-1 text-white/30">/</span>
            {count}
          </div>

          <button
            type="button"
            onClick={() => next(1)}
            disabled={nextDisabled}
            aria-label="Next card"
            className={cn(
              "grid size-9 place-items-center rounded-full border border-white/10",
              "bg-white/[0.04] text-white/80 transition-[background-color,transform,opacity] duration-200",
              "hover:bg-white/[0.09] active:scale-95",
              "disabled:pointer-events-none disabled:opacity-30",
              focusRing
            )}
          >
            <ChevronRight className="size-5" strokeWidth={2.25} />
          </button>
        </div>
      )}
    </section>
  );
}

export default OrbitCardStack;
