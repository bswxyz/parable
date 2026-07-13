"use client";

import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
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

/** Track prefers-reduced-motion reactively (defaults to reduced on the server). */
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

export interface RevenueChartDatum {
  /** X-axis tick label, e.g. a month or date. */
  label: string;
  /** The numeric value plotted for this point. */
  value: number;
}

export interface RevenueChartProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Series to plot. Ships a nice 12-point default when omitted. */
  data?: RevenueChartDatum[];
  /** Heading shown top-left of the card. */
  title?: string;
  /**
   * Line + fill colour. Defaults to Parable violet `#8b5cf6` (mirrors the
   * site's `--pb-violet` token).
   */
  color?: string;
  /** Plot area height in pixels (excludes the header row). */
  height?: number;
  /** Formats headline, tooltip and aria values. Defaults to compact USD. */
  valueFormatter?: (n: number) => string;
}

const DEFAULT_DATA: RevenueChartDatum[] = [
  { label: "Jan", value: 42000 },
  { label: "Feb", value: 38500 },
  { label: "Mar", value: 51200 },
  { label: "Apr", value: 47800 },
  { label: "May", value: 63400 },
  { label: "Jun", value: 72100 },
  { label: "Jul", value: 68900 },
  { label: "Aug", value: 84300 },
  { label: "Sep", value: 79600 },
  { label: "Oct", value: 96200 },
  { label: "Nov", value: 108400 },
  { label: "Dec", value: 124700 },
];

const compactUSD = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

const UP = "#34d399"; // signal green
const DOWN = "#fb7185"; // signal red

const round = (v: number) => Math.round(v * 100) / 100;

/**
 * Build a smooth monotone-cubic (Fritsch–Carlson) SVG path through `pts`,
 * plus the matching closed area path down to `baseline`. Monotone tangents keep
 * the curve from overshooting between points — no spurious bumps.
 */
function buildPaths(pts: ReadonlyArray<{ x: number; y: number }>, baseline: number) {
  const n = pts.length;
  if (n === 0) return { line: "", area: "" };
  if (n === 1) {
    const p = pts[0];
    return {
      line: `M ${round(p.x)} ${round(p.y)}`,
      area: `M ${round(p.x)} ${baseline} L ${round(p.x)} ${round(p.y)} Z`,
    };
  }
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const dx: number[] = [];
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = xs[i + 1] - xs[i];
    delta[i] = dx[i] === 0 ? 0 : (ys[i + 1] - ys[i]) / dx[i];
  }
  const m: number[] = new Array(n);
  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2;
  }
  // Fritsch–Carlson monotonicity clamp.
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / delta[i];
    const b = m[i + 1] / delta[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * delta[i];
      m[i + 1] = t * b * delta[i];
    }
  }
  let seg = "";
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i];
    const c1x = xs[i] + h / 3;
    const c1y = ys[i] + (m[i] * h) / 3;
    const c2x = xs[i + 1] - h / 3;
    const c2y = ys[i + 1] - (m[i + 1] * h) / 3;
    seg += ` C ${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(
      xs[i + 1]
    )} ${round(ys[i + 1])}`;
  }
  const start = `${round(xs[0])} ${round(ys[0])}`;
  return {
    line: `M ${start}${seg}`,
    area: `M ${round(xs[0])} ${baseline} L ${start}${seg} L ${round(
      xs[n - 1]
    )} ${baseline} Z`,
  };
}

/**
 * RevenueChart — a self-contained SVG area chart block (no charting deps).
 * Draws a smooth monotone-cubic curve with a gradient fill that fades to
 * transparent, animates in on mount via stroke-dashoffset + fill fade (injected
 * keyframes), and snaps a crosshair tooltip to the nearest point on pointermove
 * or arrow-key scrub. The header shows the current value and a signed delta
 * badge. Under `prefers-reduced-motion` the chart renders complete with no
 * draw-in. Exposed to assistive tech as `role="img"` with a generated
 * trend summary.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (violet `#8b5cf6`).
 *
 * @parable/revenue-chart
 */
export function RevenueChart({
  data = DEFAULT_DATA,
  title = "Revenue",
  color = "#8b5cf6",
  height = 220,
  valueFormatter = compactUSD,
  className,
  ...props
}: RevenueChartProps) {
  useInjectedKeyframes(
    "pb-revenue-chart-kf",
    ".pb-revenue-chart-line{stroke-dasharray:1;stroke-dashoffset:1;animation:pb-revenue-chart-draw 1.15s cubic-bezier(.22,1,.36,1) forwards}" +
      ".pb-revenue-chart-area{opacity:0;animation:pb-revenue-chart-fill .9s cubic-bezier(.22,1,.36,1) .12s forwards}" +
      "@keyframes pb-revenue-chart-draw{to{stroke-dashoffset:0}}" +
      "@keyframes pb-revenue-chart-fill{to{opacity:1}}" +
      "@media (prefers-reduced-motion:reduce){.pb-revenue-chart-line{animation:none;stroke-dashoffset:0}.pb-revenue-chart-area{animation:none;opacity:1}}"
  );

  const reduced = useReducedMotion();
  const rawId = React.useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");
  const fillId = `pb-rc-fill-${uid}`;

  const [wrapRef, measured] = useElementWidth<HTMLDivElement>();
  const width = measured || 0;
  const svgRef = React.useRef<SVGSVGElement | null>(null);

  const [active, setActive] = React.useState<number | null>(null);

  const points = data.length ? data : DEFAULT_DATA;
  const n = points.length;

  // Plot geometry (pixel space — SVG viewBox matches the measured size 1:1).
  const padX = 14;
  const padTop = 14;
  const padBottom = 26;
  const plotW = Math.max(0, width - padX * 2);
  const plotH = Math.max(0, height - padTop - padBottom);
  const baseline = padTop + plotH;

  const geom = React.useMemo(() => {
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const vpad = range * 0.12 || Math.abs(max) * 0.12 || 1;
    const lo = min - vpad;
    const hi = max + vpad;
    const scaleX = (i: number) =>
      padX + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const scaleY = (v: number) =>
      hi === lo ? padTop + plotH / 2 : padTop + (1 - (v - lo) / (hi - lo)) * plotH;
    const xy = points.map((p, i) => ({
      x: scaleX(i),
      y: scaleY(p.value),
      label: p.label,
      value: p.value,
    }));
    return { xy, min, max };
  }, [points, n, padX, plotW, plotH, padTop]);

  const { line, area } = React.useMemo(
    () => buildPaths(geom.xy, baseline),
    [geom.xy, baseline]
  );

  const first = points[0]?.value ?? 0;
  const last = points[n - 1]?.value ?? 0;
  const prev = points[n - 2]?.value ?? first;
  const deltaPct = prev === 0 ? 0 : ((last - prev) / Math.abs(prev)) * 100;
  const isUp = deltaPct > 0.05;
  const isDown = deltaPct < -0.05;
  const deltaColor = isUp ? UP : isDown ? DOWN : "#a1a1aa";
  const DeltaIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  const ariaLabel = React.useMemo(() => {
    const dir =
      last > first ? "up" : last < first ? "down" : "flat";
    const overall =
      first === 0 ? 0 : Math.abs(((last - first) / Math.abs(first)) * 100);
    const maxLabel = points.find((p) => p.value === geom.max)?.label ?? "";
    const minLabel = points.find((p) => p.value === geom.min)?.label ?? "";
    return (
      `${title} trend, ${n} points. From ${valueFormatter(first)} in ${points[0]?.label} ` +
      `to ${valueFormatter(last)} in ${points[n - 1]?.label}, ` +
      `${dir} ${overall.toFixed(1)}% overall. ` +
      `Peak ${valueFormatter(geom.max)} in ${maxLabel}, low ${valueFormatter(geom.min)} in ${minLabel}.`
    );
  }, [title, n, points, first, last, geom.max, geom.min, valueFormatter]);

  const gridFractions = [0, 0.25, 0.5, 0.75, 1];

  const labelIndices = React.useMemo(() => {
    if (n <= 6) return points.map((_, i) => i);
    const step = Math.ceil(n / 6);
    const idx: number[] = [];
    for (let i = 0; i < n; i += step) idx.push(i);
    if (idx[idx.length - 1] !== n - 1) idx.push(n - 1);
    return idx;
  }, [n, points]);

  const nearestFromClientX = React.useCallback(
    (clientX: number) => {
      const svg = svgRef.current;
      if (!svg || n <= 1) return 0;
      const rect = svg.getBoundingClientRect();
      const rel = clientX - rect.left;
      const t = (rel - padX) / (plotW || 1);
      return Math.max(0, Math.min(n - 1, Math.round(t * (n - 1))));
    },
    [n, padX, plotW]
  );

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    setActive(nearestFromClientX(e.clientX));
  };
  const onPointerLeave = () => setActive(null);

  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (n <= 1) return;
    const cur = active ?? n - 1;
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

  const activePt = active != null ? geom.xy[active] : null;
  // Clamp the tooltip so it never overflows the card horizontally.
  const tipHalf = 56;
  const tipLeft = activePt
    ? Math.max(tipHalf, Math.min(width - tipHalf, activePt.x))
    : 0;

  const ready = width > 0 && plotW > 0;

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
            {valueFormatter(last)}
          </div>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold tabular-nums"
          style={{ color: deltaColor, background: `${deltaColor}1f` }}
        >
          <DeltaIcon aria-hidden size={14} strokeWidth={2.5} />
          {`${deltaPct >= 0 ? "+" : "−"}${Math.abs(deltaPct).toFixed(1)}%`}
        </span>
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
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="55%" stopColor={color} stopOpacity={0.1} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* gridlines */}
            <g aria-hidden>
              {gridFractions.map((f) => {
                const y = round(padTop + f * plotH);
                return (
                  <line
                    key={f}
                    x1={padX}
                    x2={width - padX}
                    y1={y}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={1}
                  />
                );
              })}
            </g>

            {/* area fill */}
            <path
              d={area}
              fill={`url(#${fillId})`}
              className={reduced ? undefined : "pb-revenue-chart-area"}
              aria-hidden
            />

            {/* curve */}
            <path
              d={line}
              fill="none"
              stroke={color}
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              className={reduced ? undefined : "pb-revenue-chart-line"}
              aria-hidden
            />

            {/* x-axis labels */}
            <g aria-hidden>
              {labelIndices.map((i) => {
                const pt = geom.xy[i];
                const anchor =
                  i === 0 ? "start" : i === n - 1 ? "end" : "middle";
                return (
                  <text
                    key={i}
                    x={round(pt.x)}
                    y={height - 8}
                    textAnchor={anchor}
                    fill="rgba(255,255,255,0.42)"
                    fontSize={10.5}
                    style={{
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, monospace",
                    }}
                  >
                    {pt.label}
                  </text>
                );
              })}
            </g>

            {/* crosshair + active marker */}
            {activePt && (
              <g aria-hidden>
                <line
                  x1={round(activePt.x)}
                  x2={round(activePt.x)}
                  y1={padTop}
                  y2={baseline}
                  stroke="rgba(255,255,255,0.16)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={round(activePt.x)}
                  cy={round(activePt.y)}
                  r={7}
                  fill={color}
                  fillOpacity={0.18}
                />
                <circle
                  cx={round(activePt.x)}
                  cy={round(activePt.y)}
                  r={3.75}
                  fill={color}
                  stroke="#0f0f10"
                  strokeWidth={2}
                />
              </g>
            )}
          </svg>
        )}

        {/* tooltip overlay */}
        {activePt && (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 rounded-lg border border-white/10 bg-[#18181b]/95 px-2.5 py-1.5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)] backdrop-blur"
            style={{
              left: tipLeft,
              top: Math.max(0, activePt.y - 16),
              transform: "translate(-50%, -100%)",
            }}
            role="status"
            aria-live="polite"
          >
            <div
              className="text-[10px] uppercase tracking-[0.12em] text-zinc-400"
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              {activePt.label}
            </div>
            <div className="text-sm font-semibold tabular-nums text-white">
              {valueFormatter(activePt.value)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RevenueChart;
