"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Round a float to 3 decimals — full-precision floats trip React hydration. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Clamp `n` into the inclusive `[lo, hi]` range. */
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/** Ease-out cubic — fast then settling, the classic count-up curve. */
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);

/**
 * Deterministic number formatter used on the server, the first client render,
 * and every animation frame. `toFixed` and the grouping regex behave the same
 * in Node and the browser, so the initial `0` matches across hydration and the
 * value never jumps locale.
 */
function formatNumber(value: number, decimals: number): string {
  const fixed = value.toFixed(clamp(Math.round(decimals), 0, 6));
  const [int, dec] = fixed.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return dec ? `${grouped}.${dec}` : grouped;
}

/** Inject a `<style>` with `id` exactly once, client-side, and never re-add it. */
function useInjectedKeyframes(id: string, css: string): void {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }, [id, css]);
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

const KF_ID = "pb-stats-band-kf";
const KEYFRAMES = `
@keyframes pb-stats-band-underline {
  from { opacity: 0; transform: scaleX(0); }
  to   { opacity: 1; transform: scaleX(1); }
}`;

export interface Stat {
  /** The target number the column counts up to. */
  value: number;
  /** Short caption rendered in mono beneath the number. */
  label: string;
  /** Text placed before the number, e.g. `"$"`. Not animated. */
  prefix?: string;
  /** Text placed after the number, e.g. `"%"`, `"k"`, `"M+"`. Not animated. */
  suffix?: string;
  /** Fixed decimal places for the value, e.g. `1` renders `99.9`. Defaults to 0. */
  decimals?: number;
}

export interface StatsBandProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** The statistics to display, left to right. Typically 3–5 entries. */
  stats: Stat[];
}

/**
 * StatsBand — a horizontal strip of big headline numbers that count up from zero
 * with a self-contained rAF ease-out ramp the moment the band scrolls into view.
 * Each number carries an optional prefix/suffix and fixed decimals (`"$4M+"`,
 * `"99.9%"`, `"12k"`), a mono caption beneath, and a gradient hairline that draws
 * in as the value settles; adjacent columns are split by hairline dividers and
 * stack vertically on narrow screens. The animated digits are written
 * imperatively over a constant `0` so the server and first client render agree
 * (no hydration mismatch) and React never clobbers the running value. Digits are
 * `tabular-nums` to hold their width while counting. Under
 * `prefers-reduced-motion` every value snaps to its final figure immediately with
 * no ramp. The visual strip is `aria-hidden`; a polite live region announces the
 * finished figures once, so assistive tech hears the settled numbers rather than
 * the flicker of the count.
 *
 * Colours default to the site's `--pb-*` tokens (violet #8b5cf6 → fuchsia
 * #ec4899, ink #0f0f10) and can be overridden via `--pb-violet` / `--pb-fuchsia`.
 *
 * @parable/stats-band
 */
export function StatsBand({
  stats,
  className,
  style,
  ...props
}: StatsBandProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const numRefs = React.useRef<Array<HTMLSpanElement | null>>([]);
  const [settled, setSettled] = React.useState(false);
  const reduced = usePrefersReducedMotion();

  useInjectedKeyframes(KF_ID, KEYFRAMES);

  // Re-run the ramp only when the stat *contents* change, not on every parent
  // render that hands us a fresh array literal with the same numbers.
  const statsKey = stats
    .map((s) => `${s.value}:${s.decimals ?? 0}`)
    .join("|");

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const write = (compute: (s: Stat) => number) => {
      for (let i = 0; i < stats.length; i++) {
        const el = numRefs.current[i];
        if (el) {
          el.textContent = formatNumber(compute(stats[i]), stats[i].decimals ?? 0);
        }
      }
    };

    // Reduced motion: land on the final figures at once, announce, done.
    if (reduced) {
      write((s) => s.value);
      setSettled(true);
      return;
    }

    const DURATION = 1600;
    let raf = 0;
    let startTime = 0;
    let started = false;

    const tick = (now: number) => {
      if (!startTime) startTime = now;
      const p = clamp((now - startTime) / DURATION, 0, 1);
      if (p < 1) {
        const eased = easeOutCubic(p);
        write((s) => s.value * eased);
        raf = requestAnimationFrame(tick);
      } else {
        write((s) => s.value);
        setSettled(true);
      }
    };

    const start = () => {
      if (started) return;
      started = true;
      raf = requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === "undefined") {
      start();
      return () => cancelAnimationFrame(raf);
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          start();
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(root);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
    // `stats` is read through `statsKey`; identity churn must not restart the ramp.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, statsKey]);

  const rootStyle = {
    "--pb-violet": "#8b5cf6",
    "--pb-fuchsia": "#ec4899",
    ...style,
  } as React.CSSProperties;

  return (
    <div
      ref={rootRef}
      className={cn("w-full", className)}
      style={rootStyle}
      {...props}
    >
      <div
        aria-hidden="true"
        className={cn(
          "flex flex-col divide-y divide-black/10 dark:divide-white/10",
          "sm:flex-row sm:divide-x sm:divide-y-0"
        )}
      >
        {stats.map((s, i) => {
          const decimals = s.decimals ?? 0;
          const underlineBase: React.CSSProperties = reduced
            ? { transform: "scaleX(1)", opacity: 1 }
            : settled
              ? {
                  transform: "scaleX(0)",
                  opacity: 0,
                  animationName: "pb-stats-band-underline",
                  animationDuration: "700ms",
                  animationTimingFunction: "cubic-bezier(.22,1,.36,1)",
                  animationFillMode: "both",
                  animationDelay: `${r3(i * 0.08)}s`,
                }
              : { transform: "scaleX(0)", opacity: 0 };

          return (
            <div
              key={i}
              className="flex flex-1 flex-col items-center px-6 py-5 text-center"
            >
              <span
                className={cn(
                  "inline-flex items-baseline gap-0.5",
                  "bg-gradient-to-br from-[var(--pb-violet)] to-[var(--pb-fuchsia)]",
                  "bg-clip-text text-4xl font-bold leading-none tracking-tight",
                  "tabular-nums text-transparent sm:text-5xl"
                )}
              >
                {s.prefix ? (
                  <span className="text-[0.6em] font-semibold">{s.prefix}</span>
                ) : null}
                <span
                  ref={(el) => {
                    numRefs.current[i] = el;
                  }}
                >
                  {/* Constant `0` — React never re-commits it, so the rAF loop
                      owns this text node without being clobbered on re-render. */}
                  {formatNumber(0, decimals)}
                </span>
                {s.suffix ? (
                  <span className="text-[0.6em] font-semibold">{s.suffix}</span>
                ) : null}
              </span>

              <span
                aria-hidden="true"
                className="mt-3 block h-px w-10 origin-left rounded-full bg-gradient-to-r from-[var(--pb-violet)] to-[var(--pb-fuchsia)]"
                style={underlineBase}
              />

              <span className="mt-3 block font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-black/55 dark:text-white/55">
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {settled
          ? stats
              .map(
                (s) =>
                  `${s.prefix ?? ""}${formatNumber(s.value, s.decimals ?? 0)}${
                    s.suffix ?? ""
                  } ${s.label}`
              )
              .join(", ")
          : ""}
      </div>
    </div>
  );
}

export default StatsBand;
