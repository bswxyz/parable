"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ShimmerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Colour of the travelling shimmer highlight. */
  shimmerColor?: string;
  /** Diameter of the shimmer highlight. */
  shimmerSize?: string;
  /** Seconds for one full rotation. */
  shimmerDuration?: string;
  /** Corner radius. */
  radius?: string;
  /** Background of the button face. */
  background?: string;
}

/**
 * ShimmerButton — a pill button with a conic-gradient highlight that travels
 * around the border. Fully self-contained (ships its own keyframes), themeable
 * via props, and disables motion under `prefers-reduced-motion`.
 *
 * @parable/shimmer-button
 */
export const ShimmerButton = React.forwardRef<
  HTMLButtonElement,
  ShimmerButtonProps
>(function ShimmerButton(
  {
    className,
    children,
    shimmerColor = "#c4b5fd",
    shimmerSize = "0.06em",
    shimmerDuration = "2.4s",
    radius = "9999px",
    background = "rgba(10,10,12,1)",
    style,
    ...props
  },
  ref
) {
  const vars = {
    "--spread": "90deg",
    "--shimmer-color": shimmerColor,
    "--radius": radius,
    "--speed": shimmerDuration,
    "--cut": shimmerSize,
    "--bg": background,
  } as React.CSSProperties;

  return (
    <button
      ref={ref}
      style={{ ...vars, ...style }}
      className={cn(
        "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap",
        "px-6 py-3 text-sm font-medium text-white",
        "[border-radius:var(--radius)] [background:var(--bg)]",
        "transition-transform duration-300 active:translate-y-px",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        className
      )}
      {...props}
    >
      {/* travelling shimmer */}
      <span className="pointer-events-none absolute inset-0 overflow-visible [container-type:size]">
        <span className="pb-shimmer absolute inset-[-100%] h-auto w-auto animate-[pb-slide_var(--speed)_linear_infinite]">
          <span className="absolute inset-0 h-[100cqh] w-[100cqw] [background:conic-gradient(from_calc(270deg-(var(--spread)/2)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] [translate:0_0]" />
        </span>
      </span>

      {/* content */}
      <span className="relative z-10 flex items-center gap-2">{children}</span>

      {/* highlight + inner face mask */}
      <span
        className={cn(
          "absolute z-0 [inset:var(--cut)] [border-radius:var(--radius)] [background:var(--bg)]",
          "shadow-[inset_0_-8px_10px_#ffffff1f]",
          "transition-shadow duration-300",
          "group-hover:shadow-[inset_0_-6px_10px_#ffffff3f] group-active:shadow-[inset_0_-10px_10px_#ffffff3f]"
        )}
      />

      <style>{`
        @keyframes pb-slide { to { transform: translate(-50%, -50%) rotate(360deg); } }
        .pb-shimmer { transform-origin: center; }
        @media (prefers-reduced-motion: reduce) {
          .pb-shimmer { animation: none !important; }
        }
      `}</style>
    </button>
  );
});

export default ShimmerButton;
