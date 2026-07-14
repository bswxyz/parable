"use client";

import * as React from "react";
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

/** Track prefers-reduced-motion reactively (defaults to not-reduced on the server). */
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

/** Measure an element's inline width, keeping it live via ResizeObserver. */
function useElementWidth<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () => setWidth(node.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Round to 2 decimals — full-precision floats bloat markup and trip hydration. */
const round = (v: number) => Math.round(v * 100) / 100;

/** Round to 3 decimals for sub-second animation delays emitted into inline styles. */
const r3 = (v: number) => Math.round(v * 1000) / 1000;

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

const compactNumber = (n: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

export interface BarChartDatum {
  /** X-axis category label shown under the bar. */
  label: string;
  /** The numeric height of the bar. */
  value: number;
}

export interface BarChartProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Bars to plot. Ships an 8-point default when omitted. */
  data?: BarChartDatum[];
  /**
   * Optional second series drawn as a slimmer overlay bar centred in each slot.
   * Matched to `data` by index; extra or missing points are ignored.
   */
  secondaryData?: BarChartDatum[];
  /** Heading shown top-left of the card. */
  title?: string;
  /**
   * Primary bar colour. Defaults to Parable violet `#8b5cf6` (mirrors the
   * site's `--pb-violet` token).
   */
  color?: string;
  /**
   * Overlay bar colour. Defaults to Parable signal cyan `#22d3ee` (mirrors the
   * site's `--pb-signal` token). Only used when `secondaryData` is set.
   */
  secondaryColor?: string;
  /** Legend name for the primary series. */
  seriesLabel?: string;
  /** Legend name for the overlay series. */
  secondaryLabel?: string;
  /** Plot area height in pixels (excludes the header row). */
  height?: number;
  /** Formats headline total, tooltip, tick and aria values. Defaults to compact. */
  valueFormatter?: (n: number) => string;
}

const DEFAULT_DATA: BarChartDatum[] = [
  { label: "Mon", value: 32 },
  { label: "Tue", value: 51 },
  { label: "Wed", value: 44 },
  { label: "Thu", value: 68 },
  { label: "Fri", value: 74 },
  { label: "Sat", value: 39 },
  { label: "Sun", value: 58 },
  { label: "Avg", value: 52 },
];

/** One resolved bar slot in pixel space. */
interface BarSlot {
  cx: number; // band centre x
  label: string;
  primary: { x: number; y: number; w: number; h: number; value: number; up: boolean };
  secondary:
    | { x: number; y: number; w: number; h: number; value: number; up: boolean }
    | null;
}

/**
 * BarChart — a self-contained SVG bar-chart block (no charting deps). Vertical
 * bars grow from the zero baseline on mount via a `scaleY` draw-in (injected
 * keyframes, staggered per bar, `transform-box: fill-box` so each bar pivots on
 * its own base), painted with a vertical gradient fill and rounded caps. An
 * optional slimmer overlay series renders in front for at-a-glance comparison.
 * Pointer or arrow-key focus highlights a bar and pops a value tooltip; other
 * bars dim. Light horizontal gridlines carry mono y-axis ticks and mono x-axis
 * category labels sit beneath. The header shows the title and the series total.
 * Handles negative values by pivoting bars below a drawn zero line.
 *
 * SSR-safe: geometry is derived only from measured width and props (no
 * `Math.random`/`Date.now`), and every coordinate is rounded, so the first
 * client render matches the server. Under `prefers-reduced-motion` the bars
 * render at full height immediately with no draw-in. Exposed to assistive tech
 * as `role="img"` with a generated summary.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (violet `#8b5cf6`, signal
 * `#22d3ee`) on ink `#0f0f10`.
 *
 * @parable/bar-chart
 */
export function BarChart({
  data = DEFAULT_DATA,
  secondaryData,
  title = "Weekly volume",
  color = "#8b5cf6",
  secondaryColor = "#22d3ee",
  seriesLabel = "Primary",
  secondaryLabel = "Compare",
  height = 240,
  valueFormatter = compactNumber,
  className,
  ...props
}: BarChartProps) {
  useInjectedKeyframes(
    "pb-bar-chart-kf",
    ".pb-bar-chart-rect{transition:opacity .2s ease}" +
      ".pb-bar-chart-bar{transform-box:fill-box;transform-origin:bottom;transform:scaleY(0);animation:pb-bar-chart-grow .8s cubic-bezier(.22,1,.36,1) both}" +
      "@keyframes pb-bar-chart-grow{to{transform:scaleY(1)}}" +
      "@media (prefers-reduced-motion:reduce){.pb-bar-chart-bar{animation:none!important;transform:none!important}}"
  );

  const reduced = useReducedMotion();
  const rawId = React.useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");
  const fillId = `pb-bc-fill-${uid}`;
  const fill2Id = `pb-bc-fill2-${uid}`;

  const [wrapRef, measured] = useElementWidth<HTMLDivElement>();
  const width = measured || 0;
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  const [active, setActive] = React.useState<number | null>(null);

  const points = data.length ? data : DEFAULT_DATA;
  const hasSecondary = !!secondaryData && secondaryData.length > 0;
  const n = points.length;

  // Plot geometry (pixel space — SVG viewBox matches the measured size 1:1).
  const padL = 40;
  const padR = 10;
  const padTop = 14;
  const padBottom = 26;
  const plotW = Math.max(0, width - padL - padR);
  const plotH = Math.max(0, height - padTop - padBottom);
  const baseline = padTop + plotH;

  const geom = React.useMemo(() => {
    const vals: number[] = [0];
    for (const p of points) vals.push(p.value);
    if (secondaryData) for (const p of secondaryData) vals.push(p.value);
    const dataMax = Math.max(...vals); // >= 0 (0 is seeded)
    const dataMin = Math.min(...vals); // <= 0
    const range = dataMax - dataMin;

    let hi: number;
    let lo: number;
    if (range === 0) {
      hi = 1;
      lo = 0;
    } else {
      hi = dataMax === 0 ? 0 : dataMax + range * 0.08;
      lo = dataMin === 0 ? 0 : dataMin - range * 0.08;
    }
    const span = hi - lo || 1;

    const scaleY = (v: number) => padTop + (1 - (v - lo) / span) * plotH;
    const zeroY = clamp(scaleY(0), padTop, baseline);

    const band = n > 0 ? plotW / n : plotW;
    const primaryW = clamp(band * (hasSecondary ? 0.6 : 0.66), 2, 64);
    const secondaryW = clamp(band * 0.34, 2, 40);

    const bar = (value: number, w: number) => {
      const top = scaleY(value);
      const y = Math.min(top, zeroY);
      const h = Math.max(0, Math.abs(top - zeroY));
      return { y: round(y), h: round(h), w: round(w), up: value >= 0 };
    };

    const slots: BarSlot[] = points.map((p, i) => {
      const cx = padL + band * (i + 0.5);
      const pb = bar(p.value, primaryW);
      const sv = secondaryData?.[i];
      return {
        cx: round(cx),
        label: p.label,
        primary: { x: round(cx - primaryW / 2), value: p.value, ...pb },
        secondary:
          sv != null
            ? { x: round(cx - secondaryW / 2), value: sv.value, ...bar(sv.value, secondaryW) }
            : null,
      };
    });

    // y-axis ticks at even fractions of the plot height.
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
      y: round(padTop + f * plotH),
      value: hi - f * span,
    }));

    return { slots, zeroY: round(zeroY), ticks, dataMin, hi, lo };
  }, [points, secondaryData, hasSecondary, n, padL, plotW, plotH, padTop, baseline]);

  const total = React.useMemo(
    () => points.reduce((s, p) => s + p.value, 0),
    [points]
  );

  const stats = React.useMemo(() => {
    let maxI = 0;
    let minI = 0;
    for (let i = 1; i < n; i++) {
      if (points[i].value > points[maxI].value) maxI = i;
      if (points[i].value < points[minI].value) minI = i;
    }
    return { maxI, minI };
  }, [points, n]);

  const ariaLabel = React.useMemo(() => {
    const base =
      `${title}. ${seriesLabel} total ${valueFormatter(total)} across ${n} bars. ` +
      `Highest ${points[stats.maxI]?.label} at ${valueFormatter(points[stats.maxI]?.value ?? 0)}, ` +
      `lowest ${points[stats.minI]?.label} at ${valueFormatter(points[stats.minI]?.value ?? 0)}.`;
    if (!hasSecondary) return base;
    const total2 = (secondaryData ?? []).reduce((s, p) => s + p.value, 0);
    return `${base} ${secondaryLabel} total ${valueFormatter(total2)}.`;
  }, [title, seriesLabel, valueFormatter, total, n, points, stats, hasSecondary, secondaryData, secondaryLabel]);

  const labelIndices = React.useMemo(() => {
    if (n <= 8) return points.map((_, i) => i);
    const step = Math.ceil(n / 8);
    const idx: number[] = [];
    for (let i = 0; i < n; i += step) idx.push(i);
    if (idx[idx.length - 1] !== n - 1) idx.push(n - 1);
    return idx;
  }, [n, points]);

  const nearestBand = React.useCallback(
    (clientX: number) => {
      const svg = svgRef.current;
      if (!svg || n <= 0) return 0;
      const rect = svg.getBoundingClientRect();
      const rel = clientX - rect.left;
      const band = plotW / n;
      return clamp(Math.floor((rel - padL) / (band || 1)), 0, n - 1);
    },
    [n, padL, plotW]
  );

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) =>
    setActive(nearestBand(e.clientX));
  const onPointerLeave = () => setActive(null);

  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (n <= 0) return;
    const cur = active ?? 0;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(n - 1, cur + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = Math.max(0, cur - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else if (e.key === "Escape") {
      setActive(null);
      return;
    } else return;
    e.preventDefault();
    setActive(next);
  };

  const activeSlot = active != null ? geom.slots[active] : null;
  // Tooltip anchors above the taller of the two bars in the active slot.
  const tipTop = activeSlot
    ? Math.min(
        activeSlot.primary.y,
        activeSlot.secondary ? activeSlot.secondary.y : activeSlot.primary.y
      )
    : 0;
  const tipHalf = 62;
  const tipLeft = activeSlot
    ? clamp(activeSlot.cx, tipHalf, Math.max(tipHalf, width - tipHalf))
    : 0;

  const ready = width > 0 && plotW > 0;

  const renderBar = (
    slot: BarSlot,
    which: "primary" | "secondary",
    i: number,
    gradient: string,
    dimmed: boolean
  ) => {
    const b = which === "primary" ? slot.primary : slot.secondary;
    if (!b || b.h <= 0) return null;
    const rx = round(Math.min(b.w / 2, 5));
    return (
      <rect
        key={`${which}-${i}`}
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        rx={rx}
        fill={`url(#${gradient})`}
        className={cn("pb-bar-chart-rect", !reduced && "pb-bar-chart-bar")}
        style={{
          opacity: dimmed ? 0.32 : 1,
          transformOrigin: b.up ? "bottom" : "top",
          animationDelay: reduced ? undefined : `${r3(i * 0.05)}s`,
        }}
      />
    );
  };

  return (
    <div
      className={cn(
        "relative w-full max-w-full overflow-hidden rounded-2xl border border-white/10",
        "bg-[linear-gradient(180deg,#141416,#0f0f10)] p-4 text-white sm:p-5",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_24px_48px_-28px_rgba(0,0,0,0.85)]",
        className
      )}
      {...props}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400"
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          >
            {title}
          </div>
          <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {valueFormatter(total)}
          </div>
        </div>
        {hasSecondary && (
          <div
            className="flex shrink-0 flex-col gap-1 text-[11px] tabular-nums"
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          >
            <span className="inline-flex items-center gap-1.5 text-zinc-300">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-[2px]"
                style={{ background: color }}
              />
              {seriesLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 text-zinc-300">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-[2px]"
                style={{ background: secondaryColor }}
              />
              {secondaryLabel}
            </span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div ref={wrapRef} className="relative w-full" style={{ height }}>
        {ready && (
          <svg
            ref={svgRef}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={ariaLabel}
            tabIndex={0}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
            className="block touch-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                <stop offset="100%" stopColor={color} stopOpacity={0.45} />
              </linearGradient>
              <linearGradient id={fill2Id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={secondaryColor} stopOpacity={0.95} />
                <stop offset="100%" stopColor={secondaryColor} stopOpacity={0.45} />
              </linearGradient>
            </defs>

            {/* gridlines + y-axis ticks */}
            <g aria-hidden>
              {geom.ticks.map((t, i) => (
                <g key={i}>
                  <line
                    x1={padL}
                    x2={width - padR}
                    y1={t.y}
                    y2={t.y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={1}
                  />
                  <text
                    x={padL - 8}
                    y={t.y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill="rgba(255,255,255,0.42)"
                    fontSize={9.5}
                    style={{
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    }}
                  >
                    {valueFormatter(t.value)}
                  </text>
                </g>
              ))}
            </g>

            {/* zero baseline (emphasised only when there are negatives) */}
            {geom.dataMin < 0 && (
              <line
                aria-hidden
                x1={padL}
                x2={width - padR}
                y1={geom.zeroY}
                y2={geom.zeroY}
                stroke="rgba(255,255,255,0.22)"
                strokeWidth={1}
              />
            )}

            {/* bars */}
            {geom.slots.map((slot, i) => {
              const dimmed = active != null && active !== i;
              return (
                <g key={i}>
                  {renderBar(slot, "primary", i, fillId, dimmed)}
                  {renderBar(slot, "secondary", i, fill2Id, dimmed)}
                </g>
              );
            })}

            {/* x-axis labels */}
            <g aria-hidden>
              {labelIndices.map((i) => {
                const slot = geom.slots[i];
                if (!slot) return null;
                return (
                  <text
                    key={i}
                    x={slot.cx}
                    y={height - 8}
                    textAnchor="middle"
                    fill={
                      active === i
                        ? "rgba(255,255,255,0.85)"
                        : "rgba(255,255,255,0.42)"
                    }
                    fontSize={10.5}
                    style={{
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    }}
                  >
                    {slot.label}
                  </text>
                );
              })}
            </g>
          </svg>
        )}

        {/* tooltip overlay */}
        {activeSlot && (
          <div
            className="pointer-events-none absolute z-20 rounded-lg border border-white/10 bg-[#18181b]/95 px-2.5 py-1.5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)] backdrop-blur"
            style={{
              left: tipLeft,
              top: Math.max(0, tipTop - 12),
              transform: "translate(-50%, -100%)",
            }}
            role="status"
            aria-live="polite"
          >
            <div
              className="text-[10px] uppercase tracking-[0.12em] text-zinc-400"
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
            >
              {activeSlot.label}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold tabular-nums text-white">
              <span
                aria-hidden
                className="inline-block h-2 w-2 shrink-0 rounded-[2px]"
                style={{ background: color }}
              />
              {valueFormatter(activeSlot.primary.value)}
            </div>
            {activeSlot.secondary && (
              <div className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold tabular-nums text-white">
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ background: secondaryColor }}
                />
                {valueFormatter(activeSlot.secondary.value)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BarChart;
