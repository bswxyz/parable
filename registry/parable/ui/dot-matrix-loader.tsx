"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function useInjectedKeyframes(id: string, css: string) {
  React.useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/**
 * Animation order the dots light up in.
 * - `"wave"`   — diagonal sweep, top-left to bottom-right (original default).
 * - `"orbit"`  — a radar beam rotates around the grid centre.
 * - `"snake"`  — a bright head snakes through the grid boustrophedon.
 * - `"pulse"`  — rings ripple outward from the centre.
 * - `"rain"`   — columns cascade downward, each with a random phase.
 * - `"scan"`   — a vertical scanline sweeps left to right.
 * - `"spiral"` — a curved arm spirals out from the centre.
 */
export type DotMatrixVariant =
  | "wave"
  | "orbit"
  | "snake"
  | "pulse"
  | "rain"
  | "scan"
  | "spiral";

export interface DotMatrixLoaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Grid columns. */
  cols?: number;
  /** Grid rows. */
  rows?: number;
  /** Dot diameter (px). */
  dotSize?: number;
  /** Gap between dots (px). */
  gap?: number;
  /** Dot colour. */
  color?: string;
  /** Seconds for one animation cycle. */
  speed?: number;
  /** Accessible status label. */
  label?: string;
  /** Which choreography the dots follow. Defaults to the original `"wave"`. */
  variant?: DotMatrixVariant;
}

/** Deterministic pseudo-random in [0, 1) — stable across SSR and client. */
function hash01(n: number): number {
  const x = Math.sin((n + 1) * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Normalised order t for a dot at (row, col). Dots with a lower t light up
 * earlier in the cycle; the value is turned into a per-dot animation-delay.
 */
function dotOrder(
  variant: DotMatrixVariant,
  r: number,
  c: number,
  rows: number,
  cols: number
): number {
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  const maxDist = Math.max(Math.hypot(cx, cy), 0.0001);

  switch (variant) {
    case "orbit": {
      // Straight beam sweeping around the centre — order by angle only.
      return Math.atan2(r - cy, c - cx) / (2 * Math.PI) + 0.5;
    }
    case "snake": {
      // Boustrophedon: even rows left→right, odd rows right→left.
      const k = r % 2 === 0 ? r * cols + c : r * cols + (cols - 1 - c);
      return k / (rows * cols);
    }
    case "pulse": {
      // Rings ripple outward — order by distance from centre.
      return Math.hypot(c - cx, r - cy) / maxDist;
    }
    case "rain": {
      // Head falls down each column; columns are desynchronised by a
      // deterministic per-column phase (no Math.random → SSR-safe).
      const fall = rows > 1 ? (r / rows) * 0.85 : 0;
      return hash01(c) + fall;
    }
    case "scan": {
      // Vertical line sweeping left → right; a column shares one delay.
      return cols > 1 ? c / cols : 0;
    }
    case "spiral": {
      // Angle plus 1.5 turns of radius — a curved arm winding outward.
      const theta = Math.atan2(r - cy, c - cx) / (2 * Math.PI) + 0.5;
      return theta + (Math.hypot(c - cx, r - cy) / maxDist) * 1.5;
    }
    default: {
      // "wave" — original diagonal sweep, kept verbatim for back-compat.
      return (r + c) / (rows + cols);
    }
  }
}

/** Variants that flash bright then decay (trail look) vs. soft sine pulse. */
const FLASH_VARIANTS: ReadonlySet<DotMatrixVariant> = new Set([
  "orbit",
  "snake",
  "rain",
  "scan",
]);

/**
 * DotMatrixLoader — a matrix of dots animated purely by per-dot CSS
 * animation-delay math (no rAF). Seven choreographies via the `variant` prop:
 * diagonal wave (default), rotating orbit beam, boustrophedon snake, radial
 * pulse, cascading rain, scanline sweep, and an outward spiral. Renders as an
 * accessible busy status. Under prefers-reduced-motion the animation stops and
 * dots hold at mid-opacity.
 *
 * Pairs well with the Parable palette (violet #8b5cf6, cyan #22d3ee, fuchsia
 * #ec4899 — mirroring the site's --pb-* tokens) via the `color` prop; defaults
 * to `currentColor`.
 *
 * @parable/dot-matrix-loader
 */
export function DotMatrixLoader({
  cols = 7,
  rows = 7,
  dotSize = 6,
  gap = 6,
  color = "currentColor",
  speed = 1.6,
  label = "Loading",
  variant = "wave",
  className,
  style,
  ...props
}: DotMatrixLoaderProps) {
  useInjectedKeyframes(
    "pb-dot-matrix-loader-kf",
    "@keyframes pb-dml-pulse{0%,100%{opacity:.18;transform:scale(.72)}50%{opacity:1;transform:scale(1)}}" +
      "@keyframes pb-dml-flash{0%{opacity:1;transform:scale(1.12)}24%{opacity:.45;transform:scale(.9)}55%,100%{opacity:.14;transform:scale(.7)}}" +
      "@media (prefers-reduced-motion:reduce){.pb-dml-dot{animation:none!important;opacity:.5!important;transform:none!important}}"
  );

  const dots = React.useMemo(() => {
    const arr: { delay: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const t = dotOrder(variant, r, c, rows, cols);
        // Wave keeps its original positive delays (back-compat); the newer
        // variants use negative delays so they are mid-flight on mount.
        // Rounded to 3 decimals — full-precision floats survive SSR but the
        // browser re-serialises them truncated, tripping hydration checks.
        const raw = variant === "wave" ? t * speed : -t * speed;
        arr.push({ delay: Math.round(raw * 1000) / 1000 });
      }
    }
    return arr;
  }, [rows, cols, speed, variant]);

  const keyframe = FLASH_VARIANTS.has(variant) ? "pb-dml-flash" : "pb-dml-pulse";
  const easing = FLASH_VARIANTS.has(variant)
    ? "cubic-bezier(.22,1,.36,1)"
    : "ease-in-out";

  return (
    <div
      role="status"
      aria-label={label}
      aria-live="polite"
      className={cn("inline-grid", className)}
      style={{
        gridTemplateColumns: `repeat(${cols}, ${dotSize}px)`,
        gap: `${gap}px`,
        color,
        ...style,
      }}
      {...props}
    >
      {dots.map((d, i) => (
        <span
          key={i}
          aria-hidden
          className="pb-dml-dot rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            background: "currentColor",
            animation: `${keyframe} ${speed}s ${easing} ${d.delay}s infinite`,
          }}
        />
      ))}
      <span className="sr-only">{label}…</span>
    </div>
  );
}

export default DotMatrixLoader;
