"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Run a layout effect on the client, a passive effect on the server. The value
 * this component reads from it (motion preference, roll orchestration) never
 * affects rendered markup, so there is no hydration mismatch — but running it at
 * layout time lets us reposition the digit reels *before* the browser paints, so
 * the roll never flashes its final value first.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/**
 * Track the user's reduced-motion preference. Reads `matchMedia` in the lazy
 * initializer: this is SSR-safe here because the returned value is consumed only
 * inside effects (never in JSX), so server (`false`) and client can differ
 * without a hydration mismatch — and reduced-motion users get an instant snap on
 * the very first frame instead of a stray tick of animation.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Round to 3 decimals so imperative transform floats stay crisp and compact. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Build a `cubic-bezier` easing solver (Newton-Raphson on x). */
function makeCubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(t) - x;
      if (Math.abs(dx) < 1e-5) break;
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= dx / d;
    }
    return sampleY(t);
  };
}

/** The brand roll easing — a decisive settle, no linear on the hot path. */
const EASE = makeCubicBezier(0.22, 1, 0.36, 1);

/** Digits stacked top-to-bottom inside every reel. */
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/**
 * Default formatter — fixed `en-US` grouping (e.g. `1,234,567`). A pinned locale
 * keeps the server and client output identical; pass `format` for other locales
 * or currency/percent output.
 */
const DEFAULT_NUMBER_FORMAT = new Intl.NumberFormat("en-US");
const defaultFormat = (n: number) => DEFAULT_NUMBER_FORMAT.format(n);

const isDigit = (c: string) => c >= "0" && c <= "9";

type Cell =
  | { type: "digit"; key: string; digit: number }
  | { type: "sep"; key: string; char: string };

/**
 * Split a formatted string into render cells and a `key → target digit` map.
 * Digit cells are keyed by their place from the right (`d0` = ones, `d1` = tens,
 * …) so a given place keeps a stable identity as the number grows or shrinks —
 * shared reels persist and roll, new leading reels roll in from zero.
 */
function buildCells(formatted: string): {
  cells: Cell[];
  targets: Map<string, number>;
} {
  const chars = Array.from(formatted);
  let totalDigits = 0;
  for (const ch of chars) if (isDigit(ch)) totalDigits++;

  const cells: Cell[] = [];
  const targets = new Map<string, number>();
  let seen = 0;
  chars.forEach((ch, i) => {
    if (isDigit(ch)) {
      const place = totalDigits - 1 - seen;
      seen++;
      const key = `d${place}`;
      const digit = ch.charCodeAt(0) - 48;
      targets.set(key, digit);
      cells.push({ type: "digit", key, digit });
    } else {
      cells.push({ type: "sep", key: `s${i}`, char: ch });
    }
  });
  return { cells, targets };
}

export interface AnimatedCounterProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The number to display. Changes animate — up or down — to the new value. */
  value: number;
  /** Roll duration in milliseconds. */
  duration?: number;
  /** Format the number into its display string. Defaults to `en-US` grouping. */
  format?: (n: number) => string;
  /**
   * Start the first roll only once the counter scrolls into view (via
   * `IntersectionObserver`). When `false`, it rolls on mount.
   */
  startOnView?: boolean;
}

/**
 * AnimatedCounter — a number that rolls to its value odometer-style: the string
 * is split into per-digit columns and each column slides vertically to its
 * target digit, rolling through the digits between. Uses `tabular-nums` so the
 * width never jitters, handles both increases and decreases on `value` change
 * (shared columns roll, new leading columns roll in from zero), and by default
 * waits until it scrolls into view before the first roll.
 *
 * The roll is driven imperatively (`requestAnimationFrame` writing transforms)
 * so it needs no per-frame React renders. The server renders the *final* value,
 * and the client roll starts from a layout effect — the first client paint
 * matches the server, so there is no hydration mismatch and no flash of the end
 * value. Under `prefers-reduced-motion` the counter snaps to its value with no
 * motion. The rolling columns are `aria-hidden`; a visually-hidden
 * `aria-live="polite"` node carries the real, announced value.
 *
 * Colour is inherited (`currentColor`); the component ships no palette of its
 * own but sits cleanly on the site's `--pb-*` tokens (ink #0f0f10 surfaces,
 * violet #8b5cf6 / fuchsia #ec4899 / ember #f5a623 / signal #22d3ee accents).
 *
 * @parable/animated-counter
 */
export function AnimatedCounter({
  value,
  duration = 1100,
  format = defaultFormat,
  startOnView = true,
  className,
  ...props
}: AnimatedCounterProps) {
  const reduced = usePrefersReducedMotion();

  const safe = Number.isFinite(value) ? value : 0;
  const formatted = React.useMemo(() => format(safe), [format, safe]);
  const { cells, targets } = React.useMemo(
    () => buildCells(formatted),
    [formatted]
  );

  const containerRef = React.useRef<HTMLSpanElement | null>(null);

  // Live imperative state — none of this drives React renders.
  const reels = React.useRef(new Map<string, HTMLSpanElement>());
  const current = React.useRef(new Map<string, number>()); // live continuous digit per key
  const startMap = React.useRef(new Map<string, number>());
  const targetMap = React.useRef(new Map<string, number>());
  const rafId = React.useRef<number | null>(null);
  const startTime = React.useRef(0);
  const triggered = React.useRef(false);
  const latestTargets = React.useRef<Map<string, number> | null>(null);
  const durationRef = React.useRef(duration);
  durationRef.current = duration;

  // Stable ref callback per key so reels aren't detached/reattached each render.
  const refCbs = React.useRef(new Map<string, (el: HTMLSpanElement | null) => void>());
  const getReelRef = (key: string) => {
    let cb = refCbs.current.get(key);
    if (!cb) {
      cb = (el: HTMLSpanElement | null) => {
        if (el) reels.current.set(key, el);
        else reels.current.delete(key);
      };
      refCbs.current.set(key, cb);
    }
    return cb;
  };

  const write = React.useCallback((key: string, d: number) => {
    const el = reels.current.get(key);
    if (el) el.style.transform = `translateY(${r3(-d)}em)`;
  }, []);

  const stop = React.useCallback(() => {
    if (rafId.current != null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  const snap = React.useCallback(
    (next: Map<string, number>) => {
      stop();
      next.forEach((v, k) => {
        current.current.set(k, v);
        write(k, v);
      });
    },
    [stop, write]
  );

  const animate = React.useCallback(
    (next: Map<string, number>) => {
      stop();
      const start = new Map<string, number>();
      next.forEach((_v, k) => start.set(k, current.current.get(k) ?? 0));
      startMap.current = start;
      targetMap.current = next;
      // Seat the reels at their start positions now — when this runs inside a
      // layout effect it happens pre-paint, so the roll never flashes its end.
      start.forEach((v, k) => write(k, v));
      startTime.current = performance.now();
      const dur = Math.max(1, durationRef.current);
      const tick = (now: number) => {
        const raw = Math.min(1, (now - startTime.current) / dur);
        const e = EASE(raw);
        targetMap.current.forEach((tv, k) => {
          const sv = startMap.current.get(k) ?? 0;
          const d = sv + (tv - sv) * e;
          current.current.set(k, d);
          write(k, d);
        });
        if (raw < 1) {
          rafId.current = requestAnimationFrame(tick);
        } else {
          rafId.current = null;
          targetMap.current.forEach((tv, k) => current.current.set(k, tv));
        }
      };
      rafId.current = requestAnimationFrame(tick);
    },
    [stop, write]
  );

  const triggerFromView = React.useCallback(() => {
    if (triggered.current) return;
    triggered.current = true;
    const t = latestTargets.current;
    if (t) animate(t);
  }, [animate]);

  // Orchestrate rest / hold / roll on mount and on every value change.
  useIsomorphicLayoutEffect(() => {
    latestTargets.current = targets;

    if (reduced) {
      snap(targets);
      triggered.current = true;
      return;
    }

    if (!triggered.current) {
      if (startOnView) {
        // Hold every reel at zero (pre-paint) until it scrolls into view.
        stop();
        targets.forEach((_v, k) => {
          current.current.set(k, 0);
          write(k, 0);
        });
        return;
      }
      triggered.current = true;
      targets.forEach((_v, k) => current.current.set(k, 0));
      animate(targets);
      return;
    }

    animate(targets);
  }, [formatted, targets, reduced, startOnView, snap, animate, stop, write]);

  // First-roll-on-view trigger.
  React.useEffect(() => {
    if (reduced || !startOnView || triggered.current) return;
    const node = containerRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      triggerFromView();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            triggerFromView();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.2 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [reduced, startOnView, triggerFromView]);

  // Cancel any in-flight roll on unmount.
  React.useEffect(() => stop, [stop]);

  return (
    <span
      ref={containerRef}
      className={cn(
        "inline-flex items-baseline leading-none tabular-nums",
        className
      )}
      {...props}
    >
      <span className="sr-only" aria-live="polite">
        {formatted}
      </span>

      <span aria-hidden className="inline-flex items-end select-none">
        {cells.map((cell) =>
          cell.type === "sep" ? (
            <span
              key={cell.key}
              className="block h-[1em] whitespace-pre leading-none"
            >
              {cell.char}
            </span>
          ) : (
            <span
              key={cell.key}
              className="relative block h-[1em] overflow-hidden"
            >
              <span
                ref={getReelRef(cell.key)}
                className="flex flex-col"
                style={{
                  transform: `translateY(${r3(-cell.digit)}em)`,
                  willChange: "transform",
                }}
              >
                {DIGITS.map((n) => (
                  <span
                    key={n}
                    className="block h-[1em] text-center leading-none"
                  >
                    {n}
                  </span>
                ))}
              </span>
            </span>
          )
        )}
      </span>
    </span>
  );
}

export default AnimatedCounter;
