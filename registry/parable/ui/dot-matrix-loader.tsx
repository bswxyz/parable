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
  /** Seconds for one wave sweep. */
  speed?: number;
  /** Accessible status label. */
  label?: string;
}

/**
 * DotMatrixLoader — a matrix of dots that pulse in a diagonal wave. Pure CSS
 * animation driven by per-dot delay; renders as an accessible busy status.
 * Under prefers-reduced-motion the wave stops and dots hold at mid-opacity.
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
  className,
  style,
  ...props
}: DotMatrixLoaderProps) {
  useInjectedKeyframes(
    "pb-dot-matrix-kf",
    "@keyframes pb-dot-pulse{0%,100%{opacity:.18;transform:scale(.72)}50%{opacity:1;transform:scale(1)}}@media (prefers-reduced-motion:reduce){.pb-dot{animation:none!important;opacity:.5!important}}"
  );

  const dots = React.useMemo(() => {
    const arr: { delay: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const diag = (r + c) / (rows + cols);
        arr.push({ delay: diag * speed });
      }
    }
    return arr;
  }, [rows, cols, speed]);

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
          className="pb-dot rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            background: "currentColor",
            animation: `pb-dot-pulse ${speed}s ease-in-out ${d.delay}s infinite`,
          }}
        />
      ))}
      <span className="sr-only">{label}…</span>
    </div>
  );
}

export default DotMatrixLoader;
