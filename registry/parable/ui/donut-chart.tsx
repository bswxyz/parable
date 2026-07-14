"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Round a float to 3 decimals — full-precision floats trip React hydration. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Clamp `n` into the inclusive `[lo, hi]` range. */
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

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

/** Track prefers-reduced-motion reactively (defaults to false on the server). */
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

export interface DonutChartDatum {
  /** Legend + center label for this slice. */
  label: string;
  /** Non-negative magnitude — slices are sized by value / total. */
  value: number;
  /** Optional slice colour. Falls back to the brand-palette cycle. */
  color?: string;
}

export interface DonutChartProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** Slices to plot. Zero / negative values are dropped. */
  data: DonutChartDatum[];
  /** Outer diameter of the ring in pixels. Defaults to 200. */
  size?: number;
  /** Ring stroke width in pixels (clamped to fit `size`). Defaults to 26. */
  thickness?: number;
  /** Center content. Defaults to the formatted total with a "Total" caption. */
  centerLabel?: React.ReactNode;
  /** Formats legend values, the center total and aria text. Defaults to grouped integers. */
  valueFormatter?: (n: number) => string;
}

/** Brand-palette cycle: violet, fuchsia, ember, signal, plus two soft tints. */
const DEFAULT_COLORS = [
  "#8b5cf6", // violet   --pb-violet
  "#ec4899", // fuchsia  --pb-fuchsia
  "#f5a623", // ember    --pb-ember
  "#22d3ee", // signal   --pb-signal
  "#a78bfa", // violet tint
  "#f472b6", // fuchsia tint
];

const groupedInt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);

/** Percentage string with up to one decimal, trimming a trailing ".0". */
const pctText = (pct: number) => {
  const rounded = Math.round(pct * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
};

interface Slice {
  label: string;
  value: number;
  color: string;
  fraction: number; // value / total, 0..1
  offset: number; // cumulative fraction before this slice (clockwise from top)
  index: number; // original data index, for stable keys / focus
}

/**
 * DonutChart — a hand-rolled SVG ring chart with no charting dependency. Each
 * slice is a single `<circle>` stroked arc positioned with `stroke-dasharray` /
 * `stroke-dashoffset` on a normalized `pathLength` of 1, rotated so length 0 sits
 * at twelve o'clock and grows clockwise. On mount the ring sweeps in clockwise —
 * a continuous wiper built from per-slice `animation-duration`/`-delay`
 * proportional to each arc, injected once as keyframes. Hovering (or focusing a
 * legend entry) lifts that slice outward, dims the rest and swaps the center for
 * the slice's share; leaving restores the total. The legend rows are real
 * buttons — keyboard-focusable, `:focus-visible` ringed, and clickable to pin a
 * slice. Under `prefers-reduced-motion` the full ring paints immediately with no
 * sweep and no lift (enforced in pure CSS, so it is correct even before hydration).
 * The graphic is exposed as `role="img"` with a generated breakdown label.
 *
 * Default palette (violet #8b5cf6 / fuchsia #ec4899 / ember #f5a623 /
 * signal #22d3ee on ink #0f0f10) mirrors the site's `--pb-*` tokens.
 *
 * @parable/donut-chart
 */
export function DonutChart({
  data,
  size = 200,
  thickness = 26,
  centerLabel,
  valueFormatter = groupedInt,
  className,
  ...props
}: DonutChartProps) {
  useInjectedKeyframes(
    "pb-donut-chart-kf",
    ".pb-donut-chart-seg{" +
      "stroke-dasharray:var(--pb-seg) var(--pb-gap);" +
      "animation:pb-donut-chart-sweep var(--pb-dur,.9s) cubic-bezier(.22,1,.36,1) var(--pb-delay,0s) both;" +
      "transition:opacity .3s cubic-bezier(.22,1,.36,1),transform .35s cubic-bezier(.22,1,.36,1);" +
      "transform-box:fill-box;transform-origin:center}" +
      "@keyframes pb-donut-chart-sweep{from{stroke-dasharray:0 1}}" +
      "@media (prefers-reduced-motion:reduce){" +
      ".pb-donut-chart-seg{animation:none;transition:none;transform:none!important}}"
  );

  const reduced = useReducedMotion();
  const rawId = React.useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");

  const [active, setActive] = React.useState<number | null>(null);
  const [pinned, setPinned] = React.useState<number | null>(null);
  const shown = active ?? pinned;

  // Geometry. Stroke is centered on the radius, so it must sit thickness/2
  // inside the box on each side for the ring to stay clipped-free.
  const box = Math.max(48, Math.round(size));
  const stroke = clamp(Math.round(thickness), 2, Math.floor(box / 2) - 1);
  const center = box / 2;
  const radius = (box - stroke) / 2;

  const { slices, total } = React.useMemo(() => {
    const valid = data.filter((d) => Number.isFinite(d.value) && d.value > 0);
    const sum = valid.reduce((acc, d) => acc + d.value, 0);
    let cursor = 0;
    const out: Slice[] = [];
    let originalIndex = -1;
    for (const d of data) {
      originalIndex += 1;
      if (!Number.isFinite(d.value) || d.value <= 0) continue;
      const fraction = sum > 0 ? d.value / sum : 0;
      out.push({
        label: d.label,
        value: d.value,
        color: d.color ?? DEFAULT_COLORS[out.length % DEFAULT_COLORS.length],
        fraction,
        offset: cursor,
        index: originalIndex,
      });
      cursor += fraction;
    }
    return { slices: out, total: sum };
  }, [data]);

  const ariaLabel = React.useMemo(() => {
    if (!slices.length) return "Donut chart, no data.";
    const parts = slices.map(
      (s) =>
        `${s.label} ${valueFormatter(s.value)}, ${pctText(s.fraction * 100)}`
    );
    return `Donut chart, total ${valueFormatter(total)}. ${parts.join(". ")}.`;
  }, [slices, total, valueFormatter]);

  const SWEEP = 1.1; // seconds for one full clockwise wiper

  const shownSlice =
    shown != null ? slices.find((s) => s.index === shown) ?? null : null;

  const centerPrimary: React.ReactNode = shownSlice
    ? pctText(shownSlice.fraction * 100)
    : centerLabel != null
      ? centerLabel
      : valueFormatter(total);
  const centerCaption = shownSlice ? shownSlice.label : "Total";
  const centerColor = shownSlice ? shownSlice.color : undefined;

  const highlight = (index: number | null) => setActive(index);
  const clearHighlight = () => setActive(null);
  const togglePin = (index: number) =>
    setPinned((p) => (p === index ? null : index));

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-5 rounded-2xl border border-white/10",
        "bg-[linear-gradient(180deg,#141416,#0f0f10)] p-5 text-white",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_24px_48px_-28px_rgba(0,0,0,0.85)]",
        "sm:flex-row sm:items-center sm:gap-7 sm:p-6",
        className
      )}
      {...props}
    >
      {/* Ring */}
      <div
        className="relative shrink-0"
        style={{ width: box, height: box }}
      >
        <svg
          width={box}
          height={box}
          viewBox={`0 0 ${box} ${box}`}
          role="img"
          aria-label={ariaLabel}
          className="block"
        >
          <defs>
            {slices.map((s) => (
              <linearGradient
                key={s.index}
                id={`pb-donut-${uid}-${s.index}`}
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity={1} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.78} />
              </linearGradient>
            ))}
          </defs>

          {/* Rotate so length 0 sits at 12 o'clock, growing clockwise. */}
          <g transform={`rotate(-90 ${center} ${center})`}>
            {/* Track */}
            <circle
              cx={center}
              cy={center}
              r={r3(radius)}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={stroke}
              aria-hidden
            />

            {slices.map((s) => {
              const isActive = shown === s.index;
              const dim = shown != null && !isActive;
              // Small end-gap so neighbouring arcs read as distinct.
              const gapPad =
                slices.length > 1 ? Math.min(0.012, s.fraction * 0.25) : 0;
              const seg = r3(Math.max(0, s.fraction - gapPad));
              const gap = r3(Math.max(0, 1 - seg));
              const dur = r3(Math.max(0.16, s.fraction * SWEEP));
              const delay = r3(s.offset * SWEEP);
              return (
                <circle
                  key={s.index}
                  cx={center}
                  cy={center}
                  r={r3(radius)}
                  fill="none"
                  stroke={`url(#pb-donut-${uid}-${s.index})`}
                  strokeWidth={stroke}
                  strokeLinecap="butt"
                  pathLength={1}
                  className="pb-donut-chart-seg"
                  strokeDashoffset={r3(-s.offset)}
                  style={
                    {
                      cursor: "pointer",
                      opacity: dim ? 0.42 : 1,
                      transform:
                        isActive && !reduced ? "scale(1.055)" : undefined,
                      "--pb-seg": seg,
                      "--pb-gap": gap,
                      "--pb-dur": `${dur}s`,
                      "--pb-delay": `${delay}s`,
                    } as React.CSSProperties
                  }
                  onPointerEnter={() => highlight(s.index)}
                  onPointerLeave={clearHighlight}
                  aria-hidden
                />
              );
            })}
          </g>
        </svg>

        {/* Center readout */}
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center"
          aria-hidden
        >
          <div
            className="max-w-[70%] text-2xl font-semibold leading-none tracking-tight tabular-nums transition-colors duration-300"
            style={{ color: centerColor ?? "#fafafa" }}
          >
            {centerPrimary}
          </div>
          <div
            className="mt-1.5 max-w-[76%] truncate text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400"
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            {centerCaption}
          </div>
        </div>
      </div>

      {/* Legend */}
      <ul className="flex w-full min-w-0 flex-col gap-1 sm:w-auto sm:min-w-[9rem]">
        {slices.length === 0 && (
          <li className="text-sm text-zinc-500">No data</li>
        )}
        {slices.map((s) => {
          const isActive = shown === s.index;
          const isPinned = pinned === s.index;
          return (
            <li key={s.index}>
              <button
                type="button"
                onPointerEnter={() => highlight(s.index)}
                onPointerLeave={clearHighlight}
                onFocus={() => highlight(s.index)}
                onBlur={clearHighlight}
                onClick={() => togglePin(s.index)}
                aria-pressed={isPinned}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left",
                  "outline-none transition-colors duration-200",
                  "hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/40",
                  isActive && "bg-white/5"
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-inset ring-white/20 transition-transform duration-200"
                  style={{
                    background: s.color,
                    transform: isActive ? "scale(1.25)" : undefined,
                  }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">
                  {s.label}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-white">
                  {valueFormatter(s.value)}
                </span>
                <span
                  className="w-11 shrink-0 text-right text-xs tabular-nums text-zinc-500"
                  style={{
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                  }}
                >
                  {pctText(s.fraction * 100)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default DonutChart;
