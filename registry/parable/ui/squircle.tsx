"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Round a float to 3 decimals — full-precision floats trip React hydration. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Clamp `n` into the inclusive `[lo, hi]` range. */
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/** Branchless sign: -1, 0, or 1. */
const sgn = (v: number) => (v < 0 ? -1 : v > 0 ? 1 : 0);

/**
 * Sample a superellipse (Lamé curve, `|x/a|^n + |y/b|^n = 1`) into an SVG path
 * in `objectBoundingBox` space — every coord lives in `0..1`, centred on
 * `(0.5, 0.5)`, so the clip stretches to whatever box it is applied to. The
 * curve is walked with the parametric form
 * `x = |cos t|^(2/n)·sgn(cos t)`, `y = |sin t|^(2/n)·sgn(sin t)`, which stays
 * numerically stable for large `n` where the implicit form degenerates.
 *
 * Pure and deterministic: identical `smoothing` yields byte-identical output on
 * the server and the client, and every coordinate is rounded to 3dp so the
 * markup hydrates without a mismatch.
 */
function superellipsePath(smoothing: number, samples: number): string {
  const n = Number.isFinite(smoothing) ? clamp(smoothing, 2, 20) : 4;
  const exp = 2 / n;
  let d = "";
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = 0.5 + 0.5 * Math.pow(Math.abs(c), exp) * sgn(c);
    const y = 0.5 + 0.5 * Math.pow(Math.abs(s), exp) * sgn(s);
    d += `${i === 0 ? "M" : "L"}${r3(x)} ${r3(y)} `;
  }
  return `${d}Z`;
}

export interface SquircleProps extends React.HTMLAttributes<HTMLElement> {
  /** Content clipped to the squircle. */
  children?: React.ReactNode;
  /**
   * Square side length. A number is treated as pixels; a string (e.g. `"100%"`,
   * `"12rem"`) is used verbatim on both axes. On a non-square box the mask
   * stretches to fit. Defaults to `128`.
   */
  size?: number | string;
  /** Superellipse exponent: `2` = ellipse, `4` = Apple squircle, `5`+ squarer. */
  smoothing?: number;
  /** Optional outline that traces the squircle edge (constant screen-px width). */
  border?: { width: number; color: string };
  /** Element/component to render as the root. Defaults to `"div"`. */
  as?: React.ElementType;
}

/**
 * Squircle — an Apple-style superellipse mask. The rounded-rect outline is a
 * true Lamé curve (not four quarter-circles), sampled here into an SVG path and
 * used as a `clipPath` so any content — an image, a gradient, a card — takes on
 * the continuous, corner-smooth silhouette. The path is emitted in
 * `objectBoundingBox` units, so one mask fits every size and aspect ratio; an
 * optional `border` re-strokes the same path with a `non-scaling-stroke`, giving
 * a crisp constant-width outline at any scale.
 *
 * Fully static by construction, so it is trivially safe under
 * `prefers-reduced-motion` — there is no animation to reduce, and the rendered
 * output is the legible fallback. The clip id is derived from `useId` (colons
 * stripped) so multiple instances never collide, and the geometry is a pure,
 * deterministic function of `smoothing` — server and first client render match.
 *
 * Colours are consumer-supplied (via children and `border`); when a brand accent
 * is wanted it mirrors the site's `--pb-*` tokens — violet #8b5cf6,
 * fuchsia #ec4899, ember #f5a623, signal #22d3ee on ink #0f0f10.
 *
 * @parable/squircle
 */
export function Squircle({
  children,
  size = 128,
  smoothing = 4,
  border,
  as,
  className,
  style,
  ...props
}: SquircleProps) {
  const Component = as ?? "div";

  const rawId = React.useId();
  const clipId = `pb-squircle-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  const path = React.useMemo(
    () => superellipsePath(smoothing, 96),
    [smoothing]
  );

  const dim = typeof size === "number" ? `${size}px` : size;
  const clip = `url(#${clipId})`;

  return (
    <Component
      className={cn("relative inline-block align-middle", className)}
      style={{ width: dim, height: dim, ...style }}
      {...props}
    >
      {/* Geometry: a zero-box <defs> holding the reusable clip path. */}
      <svg
        aria-hidden
        focusable="false"
        width={0}
        height={0}
        className="pointer-events-none absolute"
        style={{ width: 0, height: 0, overflow: "hidden" }}
      >
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d={path} />
          </clipPath>
        </defs>
      </svg>

      {/* Clipped content — fills the box and takes on the squircle silhouette. */}
      <div
        className="h-full w-full"
        style={{ clipPath: clip, WebkitClipPath: clip }}
      >
        {children}
      </div>

      {/* Optional outline tracing the same edge at a constant screen-px width. */}
      {border && (
        <svg
          aria-hidden
          focusable="false"
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ overflow: "visible" }}
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
        >
          <path
            d={path}
            fill="none"
            stroke={border.color}
            strokeWidth={border.width}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
    </Component>
  );
}

export default Squircle;
