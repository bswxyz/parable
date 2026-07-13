"use client";

import * as React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Track prefers-reduced-motion reactively; SSR-safe (starts false). */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Round to 3 decimals so inline SVG geometry stays hydration-stable. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** easeOutCubic — decelerating count-up, never linear on the hot path. */
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Signal palette for the delta chip / sparkline trend (mirrors --pb-* tokens). */
const UP = "#34d399"; // signal green
const DOWN = "#fb7185"; // signal red
const NEUTRAL = "#a1a1aa"; // zinc-400
const VIOLET = "#8b5cf6"; // --pb-violet

/** Count how many decimal places `n` carries, capped so formatting stays sane. */
function decimalsOf(n: number): number {
  if (!Number.isFinite(n) || Number.isInteger(n)) return 0;
  const s = String(n);
  const dot = s.indexOf(".");
  return dot === -1 ? 0 : Math.min(2, s.length - dot - 1);
}

export interface StatCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "prefix"> {
  /** Small uppercase caption above the value (e.g. "Monthly revenue"). */
  label: string;
  /** Target number. Counts up from 0 the first time the card scrolls into view. */
  value: number;
  /** Signed percentage change; renders a coloured chip with an up/down arrow. */
  delta?: number;
  /** Optional micro-series drawn as a tiny inline sparkline. */
  data?: number[];
  /** Text placed immediately before the value (e.g. "$"). */
  prefix?: string;
  /** Text placed immediately after the value (e.g. "k", "%"). */
  suffix?: string;
  /** Leading icon node, shown top-right. Decorative — hidden from a11y. */
  icon?: React.ReactNode;
  /** Formats the (animating) number. Defaults to grouped, precision-matched digits. */
  formatter?: (n: number) => string;
}

/**
 * StatCard — a dashboard KPI tile. The large `tabular-nums` value counts up from
 * zero the first time the card scrolls into view, driven by `requestAnimationFrame`
 * with an ease-out curve so digit width never jitters. A monospace, upper-tracked
 * `label` sits above it; an optional signed delta chip (up/down arrow, green for a
 * rise, red for a fall) and a tiny inline-SVG sparkline sit alongside. The count
 * animates only once, then holds. Numbers pass through `formatter`, wrapped by
 * `prefix`/`suffix`, so currency, units and precision stay in your control.
 *
 * The card surface is a plain `border` + `bg-card`, so it inherits the host theme.
 * Under `prefers-reduced-motion` the count-up is skipped entirely: the final value
 * is shown immediately — a legible, complete static fallback. The value region is a
 * live `aria-atomic` status so assistive tech reads only the settled figure, and the
 * decorative sparkline / icon are `aria-hidden`.
 *
 * Trend colours mirror the site's `--pb-*` tokens (up #34d399, down #fb7185, accent
 * violet #8b5cf6).
 *
 * @parable/stat-card
 */
export function StatCard({
  label,
  value,
  delta,
  data,
  prefix,
  suffix,
  icon,
  formatter,
  className,
  ...props
}: StatCardProps) {
  const reduced = usePrefersReducedMotion();
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  const safeValue = Number.isFinite(value) ? value : 0;

  // The number currently shown. Starts at 0 on both server and first client
  // render (no hydration mismatch); an effect animates it once in view.
  const [display, setDisplay] = React.useState(0);

  // Default formatter matches the target's own precision so the count-up keeps a
  // stable digit count instead of flickering between integer and decimal widths.
  const format = React.useMemo(() => {
    if (formatter) return formatter;
    const digits = decimalsOf(safeValue);
    const nf = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    return (n: number) => nf.format(n);
  }, [formatter, safeValue]);

  // Count-up: fire once when the card first intersects the viewport.
  React.useEffect(() => {
    const el = rootRef.current;

    // Reduced motion (or no observer support): settle on the final value.
    if (reduced || typeof IntersectionObserver === "undefined") {
      setDisplay(safeValue);
      return;
    }
    if (!el) return;

    let raf = 0;
    let start = 0;
    const duration = 1200;

    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      setDisplay(safeValue * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          raf = requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reduced, safeValue]);

  // Delta chip.
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const isUp = hasDelta && (delta as number) > 0.05;
  const isDown = hasDelta && (delta as number) < -0.05;
  const trend = isUp ? UP : isDown ? DOWN : NEUTRAL;
  const DeltaArrow = isDown ? ArrowDownRight : ArrowUpRight;

  // Sparkline colour follows the trend when a delta exists, else the accent.
  const sparkColor = hasDelta ? trend : VIOLET;
  const spark = React.useMemo(
    () => buildSparkline(data, 72, 24, 1.5),
    [data]
  );

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-card p-5",
        "text-card-foreground shadow-sm",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
        {icon != null && (
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted/60 text-muted-foreground [&_svg]:size-4"
          >
            {icon}
          </span>
        )}
      </div>

      <div
        className="text-3xl font-semibold leading-none tracking-tight tabular-nums sm:text-4xl"
        aria-live="polite"
        aria-atomic="true"
      >
        {prefix}
        {format(display)}
        {suffix}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-1">
        {hasDelta ? (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold tabular-nums"
            style={{ color: trend, background: `${trend}1f` }}
          >
            <DeltaArrow className="size-3.5" strokeWidth={2.5} aria-hidden />
            {`${(delta as number) >= 0 ? "+" : "−"}${Math.abs(
              delta as number
            ).toFixed(1)}%`}
          </span>
        ) : (
          <span />
        )}

        {spark && (
          <svg
            aria-hidden
            width={spark.w}
            height={spark.h}
            viewBox={`0 0 ${spark.w} ${spark.h}`}
            className="shrink-0 overflow-visible"
          >
            <polyline
              points={spark.points}
              fill="none"
              stroke={sparkColor}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx={spark.lastX}
              cy={spark.lastY}
              r={1.75}
              fill={sparkColor}
            />
          </svg>
        )}
      </div>
    </div>
  );
}

/**
 * Map `data` into a normalised polyline `points` string plus the trailing
 * vertex, inside a `w × h` box with `pad` breathing room. Flat / single-point
 * series render as a centred horizontal line. All coords rounded to 3 dp so the
 * markup is byte-identical across server and client renders.
 */
function buildSparkline(
  data: number[] | undefined,
  w: number,
  h: number,
  pad: number
) {
  if (!data || data.length < 2) return null;
  const clean = data.filter((n) => Number.isFinite(n));
  if (clean.length < 2) return null;

  const min = Math.min(...clean);
  const max = Math.max(...clean);
  const span = max - min || 1;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const step = innerW / (clean.length - 1);

  const coords = clean.map((n, i) => {
    const x = pad + step * i;
    const y = pad + innerH * (1 - (n - min) / span);
    return { x: r3(x), y: r3(y) };
  });

  const last = coords[coords.length - 1];
  return {
    w,
    h,
    points: coords.map((c) => `${c.x},${c.y}`).join(" "),
    lastX: last.x,
    lastY: last.y,
  };
}

export default StatCard;
