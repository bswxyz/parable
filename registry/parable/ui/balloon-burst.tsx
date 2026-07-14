"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Round a float to 3 decimals — full-precision floats trip React hydration. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Clamp `n` into the inclusive `[lo, hi]` range. */
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/**
 * Deterministic 0..1 hash of a scalar seed. Pure and stable, so a given
 * `count` yields the same balloon layout on the server and the client — no
 * `Math.random()` during render, no hydration mismatch.
 */
function hash01(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

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

/** Track prefers-reduced-motion reactively (defaults to false, then syncs). */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/** Inline style that also carries CSS custom properties. */
type StyleWithVars = React.CSSProperties & Record<`--${string}`, string | number>;

const KF_ID = "pb-balloon-burst-kf";
const KEYFRAMES =
  ".pb-balloon-burst-rise{animation:pb-balloon-burst-rise var(--pb-bb-dur,3200ms) cubic-bezier(.22,1,.36,1) var(--pb-bb-delay,0ms) both;will-change:transform,opacity}" +
  ".pb-balloon-burst-sway{animation:pb-balloon-burst-sway var(--pb-bb-sway-dur,2400ms) ease-in-out var(--pb-bb-delay,0ms) infinite;will-change:transform}" +
  ".pb-balloon-burst-static{animation:pb-balloon-burst-fade var(--pb-bb-fade-dur,1100ms) ease-in-out var(--pb-bb-delay,0ms) both;will-change:opacity}" +
  "@keyframes pb-balloon-burst-rise{0%{transform:translate3d(0,0,0);opacity:0}6%{opacity:1}70%{opacity:1}100%{transform:translate3d(0,var(--pb-bb-rise,-100vh),0);opacity:0}}" +
  "@keyframes pb-balloon-burst-sway{0%,100%{transform:translate3d(0,0,0) rotate(0deg)}25%{transform:translate3d(var(--pb-bb-sway,0px),0,0) rotate(var(--pb-bb-rot,0deg))}75%{transform:translate3d(calc(var(--pb-bb-sway,0px) * -1),0,0) rotate(calc(var(--pb-bb-rot,0deg) * -1))}}" +
  "@keyframes pb-balloon-burst-fade{0%{opacity:0}20%{opacity:1}70%{opacity:1}100%{opacity:0}}" +
  "@media (prefers-reduced-motion:reduce){.pb-balloon-burst-rise{animation:pb-balloon-burst-fade var(--pb-bb-fade-dur,1100ms) ease-in-out var(--pb-bb-delay,0ms) both}.pb-balloon-burst-sway{animation:none}}";

/** Brand palette: violet / fuchsia / ember / signal (mirrors `--pb-*` tokens). */
const DEFAULT_COLORS = ["#8b5cf6", "#ec4899", "#f5a623", "#22d3ee"];

// Geometry envelope for the deterministic per-balloon variety.
const SIZE_MIN = 24;
const SIZE_MAX = 46; // balloon body width, px
const DELAY_MAX = 520; // rise stagger, ms
const DUR_MIN_MUL = 0.82;
const DUR_MAX_MUL = 1.28; // rise duration jitter, × `duration`
const SWAY_MAX = 26; // horizontal sway amplitude, px
const ROT_MAX = 11; // tilt amplitude, deg
const SWAY_DUR_MIN = 1700;
const SWAY_DUR_MAX = 3200; // sway period, ms
const FADE_DUR = 1100; // reduced-motion cluster fade, ms

interface BalloonSpec {
  color: string;
  w: number;
  h: number;
  halfW: number;
  xPct: number; // horizontal launch position, % of overlay width
  startPct: number; // vertical offset from the origin edge, %
  clusterX: number; // reduced-motion static bouquet, % width
  clusterY: number; // reduced-motion static bouquet, % height
  delay: number; // ms
  dur: number; // ms
  sway: number; // px
  rot: number; // deg
  swayDur: number; // ms
}

interface BalloonField {
  specs: BalloonSpec[];
  /** Wall-clock lifetime of a moving burst before cleanup (ms). */
  lifetimeMotion: number;
  /** Wall-clock lifetime of a reduced-motion cluster before cleanup (ms). */
  lifetimeReduced: number;
}

/**
 * Build the deterministic set of balloons for a burst. Every value derives from
 * a seeded index hash, so the arrangement is identical on server and client and
 * from one release to the next — the celebration reads as intentional, not
 * random noise.
 */
function buildBalloons(
  count: number,
  colors: string[],
  origin: "bottom" | "center",
  duration: number
): BalloonField {
  const n = clamp(Math.round(count), 1, 80);
  const palette = colors.length ? colors : DEFAULT_COLORS;
  const specs: BalloonSpec[] = [];
  let maxLife = 0;
  let maxHalfDelay = 0;
  for (let i = 0; i < n; i++) {
    const h1 = hash01(i * 1.1 + 0.7);
    const h2 = hash01(i * 2.3 + 3.1);
    const h3 = hash01(i * 3.7 + 5.9);
    const h4 = hash01(i * 4.9 + 7.3);
    const h5 = hash01(i * 5.3 + 9.9);
    const h6 = hash01(i * 6.7 + 2.5);
    const h7 = hash01(i * 7.9 + 4.2);

    const w = r3(SIZE_MIN + h1 * (SIZE_MAX - SIZE_MIN));
    const frac = (i + 0.5) / n;
    const xPct =
      origin === "center"
        ? r3(clamp(50 + (h2 - 0.5) * 46, 6, 94))
        : r3(clamp(frac * 100 + (h2 - 0.5) * (70 / n), 3, 97));
    const startPct =
      origin === "center" ? r3(38 + (h3 - 0.5) * 20) : r3(-6 + h3 * 4);
    const delay = Math.round(h4 * DELAY_MAX);
    const dur = Math.round(
      duration * (DUR_MIN_MUL + h5 * (DUR_MAX_MUL - DUR_MIN_MUL))
    );
    const sway = r3((h6 - 0.5) * 2 * SWAY_MAX);
    const rot = r3((h7 - 0.5) * 2 * ROT_MAX);
    const swayDur = Math.round(SWAY_DUR_MIN + h2 * (SWAY_DUR_MAX - SWAY_DUR_MIN));

    specs.push({
      color: palette[i % palette.length],
      w,
      h: r3(w * 1.5),
      halfW: r3(w / 2),
      xPct,
      startPct,
      clusterX: r3(clamp(50 + (h2 - 0.5) * 30, 8, 92)),
      clusterY: r3(clamp(48 + (h3 - 0.5) * 30, 12, 84)),
      delay,
      dur,
      sway,
      rot,
      swayDur,
    });
    maxLife = Math.max(maxLife, delay + dur);
    maxHalfDelay = Math.max(maxHalfDelay, Math.round(delay * 0.5));
  }
  return {
    specs,
    lifetimeMotion: maxLife + 500,
    lifetimeReduced: maxHalfDelay + FADE_DUR + 400,
  };
}

/** A single balloon: body, specular highlight, knot, and a wavy string tail. */
function BalloonGlyph({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 40 60"
      width="100%"
      height="100%"
      fill="none"
      aria-hidden
      focusable="false"
      style={{ display: "block", overflow: "visible" }}
    >
      <path
        d="M20 45 q4.5 4 0.5 8 q-4 4 0.5 7"
        stroke={color}
        strokeOpacity={0.5}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <path d="M16.5 40 L23.5 40 L20 46 Z" fill={color} />
      <ellipse cx={20} cy={21} rx={17} ry={20} fill={color} />
      <ellipse
        cx={13.5}
        cy={14}
        rx={4.6}
        ry={6.4}
        fill="#ffffff"
        fillOpacity={0.42}
        transform="rotate(-22 13.5 14)"
      />
    </svg>
  );
}

interface Burst {
  id: number;
  travel: number; // vertical distance a balloon rises this burst, px (negative)
}

export interface BalloonBurstProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Balloons released per burst (clamped 1–80). Defaults to 18. */
  count?: number;
  /** Colours the balloons cycle through. Defaults to violet / fuchsia / ember / signal. */
  colors?: string[];
  /** Base rise duration in milliseconds (per-balloon jitter is applied). Defaults to 3200. */
  duration?: number;
  /** Where balloons launch from. Defaults to `"bottom"`. */
  origin?: "bottom" | "center";
  /**
   * Overlay positioning. `"fixed"` (default) floats over the whole viewport;
   * `"absolute"` fills the nearest positioned ancestor (use inside a `relative`
   * box, e.g. a card or a preview stage).
   */
  position?: "fixed" | "absolute";
  /** Controlled trigger: a burst fires whenever this number changes. */
  trigger?: number;
  /**
   * Auto-fire a burst every `interval` ms (ambient / demo use). Under
   * `prefers-reduced-motion` it fires exactly once and does not repeat.
   */
  interval?: number;
}

export interface BalloonBurstHandle {
  /** Imperatively release a burst of balloons. */
  release: () => void;
}

/**
 * BalloonBurst — a success-moment balloon release, packaged as a decorative
 * overlay plus an imperative trigger. On `release()` (or a changed `trigger`) it
 * spawns a burst of `count` balloons that rise from the bottom (or centre) with
 * a gentle pendulum sway and tilt, varied sizes and brand colours, a wavy string
 * tail, then fade near the top and self-clean once their animation completes.
 * Motion is pure GPU-composited CSS keyframes (a `translateY` rise on the outer
 * element, an independent `translateX`+`rotate` sway on the inner) driven by
 * per-balloon offsets from a deterministic index hash — so the server and first
 * client render agree and no `Math.random()` runs during render. Multiple bursts
 * stack and expire independently.
 *
 * The overlay is `aria-hidden`, `pointer-events-none`, and `fixed`/`absolute`, so
 * it never blocks the page. Under `prefers-reduced-motion` a burst becomes a
 * single brief, motionless cluster that fades — no rise, no sway.
 *
 * Use imperatively via {@link useBalloons} (`const { ref, release } =
 * useBalloons()` → `<BalloonBurst ref={ref} />`), by bumping `trigger`, or with
 * `interval` for an ambient loop.
 *
 * Default palette (violet #8b5cf6 / fuchsia #ec4899 / ember #f5a623 / signal
 * #22d3ee) mirrors the site's `--pb-*` tokens.
 *
 * @parable/balloon-burst
 */
export const BalloonBurst = React.forwardRef<
  BalloonBurstHandle,
  BalloonBurstProps
>(function BalloonBurst(
  {
    count = 18,
    colors = DEFAULT_COLORS,
    duration = 3200,
    origin = "bottom",
    position = "fixed",
    trigger,
    interval,
    className,
    style,
    ...props
  },
  ref
) {
  useInjectedKeyframes(KF_ID, KEYFRAMES);

  const reduced = useReducedMotion();
  const reducedRef = React.useRef(reduced);
  reducedRef.current = reduced;

  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  const [bursts, setBursts] = React.useState<Burst[]>([]);
  const burstSeq = React.useRef(0);
  const timers = React.useRef<Set<number>>(new Set());

  const palette = colors.length ? colors : DEFAULT_COLORS;
  const colorKey = palette.join("|");
  const field = React.useMemo(
    () => buildBalloons(count, palette, origin, duration),
    // colorKey stands in for `palette`; buildBalloons only reads its values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, colorKey, origin, duration]
  );

  const spawn = React.useCallback(() => {
    const overlay = overlayRef.current;
    const h =
      overlay?.clientHeight ||
      (typeof window !== "undefined" ? window.innerHeight : 800);
    const travel = -Math.round(h * 1.18 + 96);
    const id = ++burstSeq.current;
    setBursts((prev) => [...prev, { id, travel }]);

    const life = reducedRef.current
      ? field.lifetimeReduced
      : field.lifetimeMotion;
    const t = window.setTimeout(() => {
      setBursts((prev) => prev.filter((x) => x.id !== id));
      timers.current.delete(t);
    }, life);
    timers.current.add(t);
  }, [field.lifetimeMotion, field.lifetimeReduced]);

  React.useImperativeHandle(ref, () => ({ release: spawn }), [spawn]);

  // Controlled trigger: fire when it changes, but never on first mount.
  const prevTrigger = React.useRef(trigger);
  React.useEffect(() => {
    if (trigger === undefined || trigger === prevTrigger.current) return;
    prevTrigger.current = trigger;
    spawn();
  }, [trigger, spawn]);

  // Ambient auto-loop. Reduced motion fires a single cluster and stops.
  React.useEffect(() => {
    if (!interval || interval <= 0) return;
    spawn();
    if (reducedRef.current) return;
    const id = window.setInterval(spawn, interval);
    return () => window.clearInterval(id);
  }, [interval, spawn]);

  // Clear any pending cleanup timers on unmount.
  React.useEffect(() => {
    const set = timers.current;
    return () => {
      set.forEach((id) => window.clearTimeout(id));
      set.clear();
    };
  }, []);

  const renderBalloon = (burst: Burst, b: BalloonSpec, i: number) => {
    const key = `${burst.id}-${i}`;
    if (reduced) {
      const staticStyle: StyleWithVars = {
        left: `${b.clusterX}%`,
        top: `${b.clusterY}%`,
        width: `${b.w}px`,
        height: `${b.h}px`,
        marginLeft: `${-b.halfW}px`,
        "--pb-bb-delay": `${Math.round(b.delay * 0.5)}ms`,
        "--pb-bb-fade-dur": `${FADE_DUR}ms`,
      };
      return (
        <div
          key={key}
          className="pb-balloon-burst-static absolute"
          style={staticStyle}
        >
          <BalloonGlyph color={b.color} />
        </div>
      );
    }

    const outer: StyleWithVars = {
      left: `${b.xPct}%`,
      width: `${b.w}px`,
      height: `${b.h}px`,
      marginLeft: `${-b.halfW}px`,
      "--pb-bb-rise": `${burst.travel}px`,
      "--pb-bb-dur": `${b.dur}ms`,
      "--pb-bb-delay": `${b.delay}ms`,
      ...(origin === "center"
        ? { top: `${b.startPct}%` }
        : { bottom: `${b.startPct}%` }),
    };
    const inner: StyleWithVars = {
      width: "100%",
      height: "100%",
      "--pb-bb-sway": `${b.sway}px`,
      "--pb-bb-rot": `${b.rot}deg`,
      "--pb-bb-sway-dur": `${b.swayDur}ms`,
    };
    return (
      <div key={key} className="pb-balloon-burst-rise absolute" style={outer}>
        <div className="pb-balloon-burst-sway" style={inner}>
          <BalloonGlyph color={b.color} />
        </div>
      </div>
    );
  };

  return (
    <div
      ref={overlayRef}
      aria-hidden
      className={cn(
        "pointer-events-none z-50 overflow-hidden",
        position === "fixed" ? "fixed inset-0" : "absolute inset-0",
        className
      )}
      style={style}
      {...props}
    >
      {bursts.flatMap((burst) =>
        field.specs.map((b, i) => renderBalloon(burst, b, i))
      )}
    </div>
  );
});

BalloonBurst.displayName = "BalloonBurst";

/**
 * useBalloons — imperative controller for a {@link BalloonBurst}. Attach the
 * returned `ref` to a `<BalloonBurst ref={ref} />` and call `release()` from any
 * success handler to launch a burst.
 *
 * ```tsx
 * const { ref, release } = useBalloons();
 * return (
 *   <>
 *     <button onClick={release}>Celebrate</button>
 *     <BalloonBurst ref={ref} />
 *   </>
 * );
 * ```
 */
export function useBalloons() {
  const ref = React.useRef<BalloonBurstHandle | null>(null);
  const release = React.useCallback(() => {
    ref.current?.release();
  }, []);
  return { ref, release } as const;
}

export default BalloonBurst;
