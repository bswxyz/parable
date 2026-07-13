"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Track the user's reduced-motion preference, SSR-safe (starts false). */
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

/** Round to 3 decimals so inline-style floats stay hydration-stable. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

export interface ProgressRingProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Progress amount; clamped to 0–100. */
  value: number;
  /** Outer diameter in px. */
  size?: number;
  /** Stroke width in px. Defaults to ~`size / 12`. */
  thickness?: number;
  /** Two hex stops for the gradient stroke (start → end). */
  colors?: [string, string];
  /** Colour of the unfilled track ring behind the progress arc. */
  trackColor?: string;
  /** Render the rounded percentage in the centre when no `children` are given. */
  showValue?: boolean;
  /** Custom centred label (node); overrides the percentage when present. */
  children?: React.ReactNode;
}

/**
 * ProgressRing — a circular SVG progress indicator. A rounded-cap arc sweeps to
 * `value` by animating `stroke-dashoffset` with a pure CSS transition (no JS
 * animation library): it draws from empty on mount and re-sweeps whenever
 * `value` changes. The stroke is a two-stop SVG `linearGradient` (violet →
 * fuchsia by default) laid over a dim track ring, with a centred percentage or
 * custom `children` label. Exposes real `role="progressbar"` semantics
 * (`aria-valuenow` / `aria-valuemin` / `aria-valuemax`); the decorative SVG is
 * `aria-hidden`. Under `prefers-reduced-motion` the sweep is disabled and the
 * ring renders statically at its final value — a legible, complete fallback.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (violet #8b5cf6 →
 * fuchsia #ec4899); the label inherits `currentColor`.
 *
 * @parable/progress-ring
 */
export function ProgressRing({
  value,
  size = 120,
  thickness,
  colors = ["#8b5cf6", "#ec4899"],
  trackColor = "rgba(255,255,255,0.1)",
  showValue = true,
  className,
  children,
  style,
  ...props
}: ProgressRingProps) {
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Unique, selector-safe gradient id (React useId emits colons).
  const gradientId = `pb-progress-ring-${React.useId().replace(/:/g, "")}`;

  const safe = Number.isFinite(value) ? value : 0;
  const clamped = Math.min(100, Math.max(0, safe));
  const rounded = Math.round(clamped);

  const stroke = Math.max(1, thickness ?? Math.round(size / 12));
  const radius = Math.max(0, (size - stroke) / 2);
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Sweep empty → `clamped` on mount; snap straight to final under reduced
  // motion. First client render matches the server (empty), so no hydration
  // mismatch — the effect flips `mounted` and the CSS transition takes over.
  const shown = reduced ? clamped : mounted ? clamped : 0;
  const offset = r3(circumference * (1 - shown / 100));

  const [c0, c1] = colors;
  const label = children ?? (showValue ? `${rounded}%` : null);

  return (
    <div
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size, ...style }}
      role="progressbar"
      aria-label="Progress"
      {...props}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={rounded}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden
        className="block"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c0} />
            <stop offset="100%" stopColor={c1} />
          </linearGradient>
        </defs>
        <circle
          cx={center}
          cy={center}
          r={r3(radius)}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={r3(radius)}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={r3(circumference)}
          transform={`rotate(-90 ${center} ${center})`}
          style={{
            strokeDashoffset: offset,
            transition: reduced
              ? "none"
              : "stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </svg>

      {label != null && (
        <span
          className="absolute inset-0 flex items-center justify-center font-semibold leading-none tabular-nums text-current"
          style={{ fontSize: r3(size * 0.22) }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export default ProgressRing;
