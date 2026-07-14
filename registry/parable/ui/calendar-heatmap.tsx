"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
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

/** Track prefers-reduced-motion reactively (defaults to false so SSR = first client render). */
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

const MS_PER_DAY = 86_400_000;
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Hardcoded reference day. Rendering derives the whole grid from `endDate`
 * (this constant by default) so the server and first client render agree —
 * never `new Date()` with no argument during render.
 */
const DEFAULT_END_DATE = "2026-07-14";

/** Violet intensity ramp: [empty, low → high]. Mirrors `--pb-violet` (#8b5cf6). */
const DEFAULT_COLOR_SCALE = [
  "#232031", // 0 — no activity
  "#3f2f74", // 1
  "#5d43b3", // 2
  "#7c5cf0", // 3
  "#a78bfa", // 4 — most activity
];

/** Parse a `YYYY-MM-DD` string into an integer day-number (days since epoch, UTC). */
function parseISODay(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const ms = Date.UTC(y, mo, d);
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / MS_PER_DAY);
}

/** Day-number → `YYYY-MM-DD` (UTC), the same key space as the input data. */
function dayToISO(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Weekday of a day-number, Sunday = 0 (epoch day 0 was a Thursday = 4). */
function weekdayOf(day: number): number {
  return (((day + 4) % 7) + 7) % 7;
}

/** Human date for labels/aria, e.g. "Jul 14, 2026". */
function formatHuman(day: number): string {
  const d = new Date(day * MS_PER_DAY);
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** Bucket a raw count into an intensity level 0–4 relative to the busiest day. */
function levelFor(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

const clampInt = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Math.round(n)));

interface Cell {
  col: number;
  row: number;
  day: number;
  iso: string;
  count: number;
  level: number;
  x: number;
  y: number;
}

// --- Grid geometry (pixel space; SVG viewBox matches 1:1) ---
const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP; // 14
const LEFT_PAD = 30; // weekday-label gutter
const TOP_PAD = 16; // month-label gutter
const RADIUS = 2.5;
const TT_TOP = 48; // wrapper top padding — keeps tooltips inside the scroll box
const TT_BOTTOM = 8;
const TIP_HALF = 62;

export interface CalendarHeatmapDatum {
  /** ISO date, `YYYY-MM-DD`. Duplicate dates are summed. */
  date: string;
  /** Activity count for that day. */
  count: number;
}

export interface CalendarHeatmapProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Per-day activity. Days absent from the list render as level 0 (empty). */
  data?: CalendarHeatmapDatum[];
  /** Number of week columns to show (clamped 1–53). Defaults to 26. */
  weeks?: number;
  /** Exactly 5 colors, empty → most-active. Falls back to the violet ramp. */
  colorScale?: string[];
  /**
   * Last day of the grid, `YYYY-MM-DD`. Fixed constant by default so the grid
   * is deterministic across SSR — pass your own "today" to make it live.
   */
  endDate?: string;
  /** Top-row weekday, Sunday = 0 … Saturday = 6. Defaults to Sunday. */
  startWeekday?: number;
  /** Heading shown top-left of the card. */
  title?: string;
}

/**
 * CalendarHeatmap — a GitHub-style contributions grid, hand-rolled as SVG with
 * no charting deps. Weeks are columns, weekdays are rows; each day-cell is
 * colored by a 5-bucket value→intensity scale (a violet ramp), with month
 * labels along the top and weekday labels down the left. Hovering — or arrow-key
 * scrubbing the focusable grid — snaps a tooltip (date + count) to a cell and
 * announces it via an `aria-live` region. Cells pop in on mount with a subtle
 * diagonal (col + row) stagger driven by injected keyframes. The entire grid is
 * exposed to assistive tech as a single `role="img"` with a generated summary.
 *
 * The day grid is computed deterministically from `endDate` (a hardcoded ISO
 * constant by default) so the server and first client render match — no
 * `new Date()` with no argument during render. Under `prefers-reduced-motion`
 * the stagger is dropped and every cell renders fully visible.
 *
 * Default palette is a violet ramp (mirrors the site's `--pb-violet` #8b5cf6)
 * on ink #0f0f10.
 *
 * @parable/calendar-heatmap
 */
export function CalendarHeatmap({
  data,
  weeks = 26,
  colorScale,
  endDate = DEFAULT_END_DATE,
  startWeekday = 0,
  title = "Contributions",
  className,
  ...props
}: CalendarHeatmapProps) {
  useInjectedKeyframes(
    "pb-calendar-heatmap-kf",
    ".pb-calendar-heatmap-cell{opacity:0;transform:scale(.55);transform-box:fill-box;transform-origin:center;animation:pb-calendar-heatmap-pop .42s cubic-bezier(.22,1,.36,1) both}" +
      "@keyframes pb-calendar-heatmap-pop{to{opacity:1;transform:scale(1)}}" +
      "@media (prefers-reduced-motion:reduce){.pb-calendar-heatmap-cell{animation:none!important;opacity:1!important;transform:none!important}}"
  );

  const reduced = useReducedMotion();

  const scale =
    colorScale && colorScale.length === 5 ? colorScale : DEFAULT_COLOR_SCALE;

  const nWeeks = clampInt(weeks, 1, 53);
  const startDow = (((Math.round(startWeekday) % 7) + 7) % 7) as number;

  // Sum duplicate dates into a single count per ISO day.
  const countMap = React.useMemo(() => {
    const map = new Map<string, number>();
    if (data) {
      for (const d of data) {
        if (!d || typeof d.date !== "string") continue;
        const iso = d.date.slice(0, 10);
        map.set(iso, (map.get(iso) ?? 0) + (Number(d.count) || 0));
      }
    }
    return map;
  }, [data]);

  const model = React.useMemo(() => {
    const endDay =
      parseISODay(endDate) ?? (parseISODay(DEFAULT_END_DATE) as number);
    // Row offset of the end day within its column, then the first column's top.
    const endRow = (((weekdayOf(endDay) - startDow) % 7) + 7) % 7;
    const lastColTop = endDay - endRow;
    const gridStart = lastColTop - (nWeeks - 1) * 7;

    let maxCount = 0;
    for (const v of countMap.values()) if (v > maxCount) maxCount = v;

    const cells: Array<Cell | null> = new Array(nWeeks * 7).fill(null);
    let total = 0;
    let busiest = -1;
    let busiestCount = -1;

    for (let col = 0; col < nWeeks; col++) {
      for (let row = 0; row < 7; row++) {
        const day = gridStart + col * 7 + row;
        const idx = col * 7 + row;
        if (day > endDay) {
          cells[idx] = null; // future — leave blank
          continue;
        }
        const iso = dayToISO(day);
        const count = countMap.get(iso) ?? 0;
        total += count;
        if (count > busiestCount) {
          busiestCount = count;
          busiest = day;
        }
        cells[idx] = {
          col,
          row,
          day,
          iso,
          count,
          level: levelFor(count, maxCount),
          x: LEFT_PAD + col * STEP,
          y: TOP_PAD + row * STEP,
        };
      }
    }

    // Month labels: mark a column when its top-cell month differs from the
    // previous column's — but skip a stray single-column tail at the far left.
    const monthOf = (col: number) =>
      new Date((gridStart + col * 7) * MS_PER_DAY).getUTCMonth();
    const monthLabels: Array<{ col: number; name: string }> = [];
    for (let col = 0; col < nWeeks; col++) {
      const m = monthOf(col);
      if (col === 0) {
        if (nWeeks === 1 || monthOf(1) === m) {
          monthLabels.push({ col, name: MONTHS_SHORT[m] });
        }
      } else if (m !== monthOf(col - 1)) {
        monthLabels.push({ col, name: MONTHS_SHORT[m] });
      }
    }

    // Weekday labels on alternating rows (1, 3, 5) for legibility.
    const weekdayLabels: Array<{ row: number; name: string }> = [];
    for (let row = 1; row < 7; row += 2) {
      weekdayLabels.push({ row, name: WEEKDAYS_SHORT[(startDow + row) % 7] });
    }

    const svgW = LEFT_PAD + nWeeks * STEP - GAP;
    const svgH = TOP_PAD + 7 * STEP - GAP;

    return {
      cells,
      monthLabels,
      weekdayLabels,
      total,
      busiest,
      busiestCount: Math.max(0, busiestCount),
      startDay: gridStart,
      endDay,
      svgW,
      svgH,
    };
  }, [countMap, nWeeks, startDow, endDate]);

  const {
    cells,
    monthLabels,
    weekdayLabels,
    total,
    busiest,
    busiestCount,
    startDay,
    endDay,
    svgW,
    svgH,
  } = model;

  // The end day's cell — the default keyboard entry point.
  const endIndex = React.useMemo(() => {
    for (let i = cells.length - 1; i >= 0; i--) if (cells[i]) return i;
    return 0;
  }, [cells]);

  const [active, setActive] = React.useState<number | null>(null);
  // Keep the active index valid if the grid shape changes underneath it.
  React.useEffect(() => {
    setActive((cur) => (cur == null || cells[cur] ? cur : null));
  }, [cells]);

  const ariaLabel = React.useMemo(() => {
    const range = `${formatHuman(startDay)} to ${formatHuman(endDay)}`;
    if (total <= 0) return `${title} heatmap — no activity from ${range}.`;
    const c = total === 1 ? "contribution" : "contributions";
    const busy =
      busiest >= 0 && busiestCount > 0
        ? ` Busiest day ${formatHuman(busiest)} with ${busiestCount}.`
        : "";
    return `${title} heatmap — ${total} ${c} from ${range}.${busy}`;
  }, [title, total, startDay, endDay, busiest, busiestCount]);

  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const cur = active ?? endIndex;
    let col = Math.floor(cur / 7);
    let row = cur % 7;
    switch (e.key) {
      case "ArrowRight":
        col = Math.min(nWeeks - 1, col + 1);
        break;
      case "ArrowLeft":
        col = Math.max(0, col - 1);
        break;
      case "ArrowDown":
        row = Math.min(6, row + 1);
        break;
      case "ArrowUp":
        row = Math.max(0, row - 1);
        break;
      case "Home":
        setActive(0);
        e.preventDefault();
        return;
      case "End":
        setActive(endIndex);
        e.preventDefault();
        return;
      case "Escape":
        setActive(null);
        return;
      default:
        return;
    }
    e.preventDefault();
    const idx = col * 7 + row;
    if (cells[idx]) setActive(idx); // ignore moves into blank/future cells
  };

  const activeCell = active != null ? cells[active] : null;

  // Tooltip position, inside the padded scroll wrapper; clamped horizontally.
  const tipLeft = activeCell
    ? clampInt(activeCell.x + CELL / 2, TIP_HALF, svgW - TIP_HALF)
    : 0;
  const tipTop = activeCell ? TT_TOP + activeCell.y - 8 : 0;

  const legendSwatch = (fill: string, key: React.Key) => (
    <span
      key={key}
      aria-hidden
      className="inline-block h-[11px] w-[11px] rounded-[2.5px]"
      style={{ backgroundColor: fill }}
    />
  );

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
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-400"
            style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          >
            <CalendarDays aria-hidden size={13} strokeWidth={2} />
            {title}
          </div>
          <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
            {total.toLocaleString()}
            <span className="ml-1.5 text-sm font-normal text-zinc-400">
              {total === 1 ? "contribution" : "contributions"}
            </span>
          </div>
        </div>
        <div
          className="shrink-0 pt-1 text-right text-[11px] leading-tight text-zinc-500"
          style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        >
          {formatHuman(startDay)}
          <br />
          {formatHuman(endDay)}
        </div>
      </div>

      {/* Heatmap (horizontal scroll on narrow viewports) */}
      <div className="overflow-x-auto">
        <div
          className="relative inline-block"
          style={{ paddingTop: TT_TOP, paddingBottom: TT_BOTTOM }}
        >
          <svg
            width={svgW}
            height={svgH}
            viewBox={`0 0 ${svgW} ${svgH}`}
            role="img"
            aria-label={ariaLabel}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive((cur) => (cur == null ? endIndex : cur))}
            onBlur={() => setActive(null)}
            className="block touch-none rounded-md outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70"
          >
            {/* Weekday labels */}
            <g
              aria-hidden
              fill="rgba(255,255,255,0.42)"
              fontSize={9.5}
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
            >
              {weekdayLabels.map((w) => (
                <text
                  key={w.row}
                  x={LEFT_PAD - 8}
                  y={TOP_PAD + w.row * STEP + CELL - 2}
                  textAnchor="end"
                >
                  {w.name}
                </text>
              ))}
            </g>

            {/* Month labels */}
            <g
              aria-hidden
              fill="rgba(255,255,255,0.5)"
              fontSize={10}
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
            >
              {monthLabels.map((m) => (
                <text key={`${m.col}-${m.name}`} x={LEFT_PAD + m.col * STEP} y={TOP_PAD - 6}>
                  {m.name}
                </text>
              ))}
            </g>

            {/* Day cells */}
            <g>
              {cells.map((cell, idx) => {
                if (!cell) return null;
                const isActive = idx === active;
                const delay = reduced ? 0 : Math.round((cell.col + cell.row) * 13);
                return (
                  <rect
                    key={idx}
                    x={cell.x}
                    y={cell.y}
                    width={CELL}
                    height={CELL}
                    rx={RADIUS}
                    ry={RADIUS}
                    fill={scale[cell.level]}
                    stroke={isActive ? "#ffffff" : "rgba(255,255,255,0.04)"}
                    strokeWidth={isActive ? 1.25 : 1}
                    className={reduced ? undefined : "pb-calendar-heatmap-cell"}
                    style={reduced ? undefined : { animationDelay: `${delay}ms` }}
                    onPointerEnter={() => setActive(idx)}
                  />
                );
              })}
            </g>
          </svg>

          {/* Tooltip */}
          {activeCell && (
            <div
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-[#18181b]/95 px-2.5 py-1.5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.7)] backdrop-blur"
              style={{ left: tipLeft, top: tipTop }}
              role="status"
              aria-live="polite"
            >
              <div className="whitespace-nowrap text-sm font-semibold tabular-nums text-white">
                {activeCell.count.toLocaleString()}{" "}
                {activeCell.count === 1 ? "contribution" : "contributions"}
              </div>
              <div
                className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-zinc-400"
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
              >
                {formatHuman(activeCell.day)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-zinc-500">
        <span>Less</span>
        <span className="flex items-center gap-1">
          {scale.map((c, i) => legendSwatch(c, i))}
        </span>
        <span>More</span>
      </div>
    </div>
  );
}

export default CalendarHeatmap;
