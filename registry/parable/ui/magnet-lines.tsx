"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface MagnetLinesProps
  extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number;
  columns?: number;
  /** Line container size, any CSS length. */
  lineWidth?: string;
  lineHeight?: string;
  color?: string;
  /** Base (resting) rotation in degrees. */
  baseAngle?: number;
}

/**
 * MagnetLines — a grid of little bars that all rotate to point at the cursor
 * (or touch), like iron filings around a magnet. Pointer-driven with no rAF
 * loop; under prefers-reduced-motion the bars hold their base angle.
 *
 * @parable/magnet-lines
 */
export function MagnetLines({
  rows = 9,
  columns = 9,
  lineWidth = "0.5vmin",
  lineHeight = "4vmin",
  color = "#8b5cf6",
  baseAngle = -10,
  className,
  style,
  ...props
}: MagnetLinesProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const spans = Array.from(
      root.querySelectorAll<HTMLSpanElement>("span")
    );
    const onMove = (x: number, y: number) => {
      spans.forEach((s) => {
        const r = s.getBoundingClientRect();
        const cx = r.x + r.width / 2;
        const cy = r.y + r.height / 2;
        const b = Math.atan2(y - cy, x - cx);
        s.style.setProperty("--r", `${(b * 180) / Math.PI}deg`);
      });
    };
    const mm = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const tm = (e: TouchEvent) =>
      e.touches[0] && onMove(e.touches[0].clientX, e.touches[0].clientY);
    window.addEventListener("mousemove", mm, { passive: true });
    window.addEventListener("touchmove", tm, { passive: true });
    return () => {
      window.removeEventListener("mousemove", mm);
      window.removeEventListener("touchmove", tm);
    };
  }, []);

  const total = rows * columns;
  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("grid place-items-center", className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        ...style,
      }}
      {...props}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="origin-center transition-transform duration-300 ease-out [transform:rotate(var(--r,0deg))] motion-reduce:transition-none"
          style={{
            // @ts-expect-error custom prop
            "--r": `${baseAngle}deg`,
            display: "block",
            width: lineWidth,
            height: lineHeight,
            background: color,
            borderRadius: "9999px",
          }}
        />
      ))}
    </div>
  );
}

export default MagnetLines;
