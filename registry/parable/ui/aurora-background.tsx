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

export interface AuroraBackgroundProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Two or more colours the aurora blends between. */
  colors?: string[];
  /** Base backdrop colour. */
  background?: string;
  /** Animation seconds for one cycle. */
  speed?: number;
  /** Blur radius of the aurora bands. */
  blur?: string;
  /** Show a subtle grain overlay. */
  grain?: boolean;
}

/**
 * AuroraBackground — a GPU-cheap animated aurora made of drifting radial
 * gradient bands (transform + opacity only, no filters on the hot path except a
 * single static blur). Sits behind content via absolute fill. Freezes under
 * prefers-reduced-motion.
 *
 * @parable/aurora-background
 */
export function AuroraBackground({
  colors = ["#8b5cf6", "#ec4899", "#22d3ee"],
  background = "#0a0a0c",
  speed = 18,
  blur = "72px",
  grain = true,
  className,
  children,
  style,
  ...props
}: AuroraBackgroundProps) {
  useInjectedKeyframes(
    "pb-aurora-kf",
    "@keyframes pb-aurora-drift{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(8%,-6%) scale(1.15)}66%{transform:translate(-6%,8%) scale(0.92)}}@media (prefers-reduced-motion:reduce){.pb-aurora{animation:none!important}}"
  );

  const bands = React.useMemo(
    () =>
      colors.map((c, i) => ({
        c,
        top: `${(i * 37) % 70}%`,
        left: `${(i * 53) % 60}%`,
        delay: `-${(i * speed) / colors.length}s`,
      })),
    [colors, speed]
  );

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ background, ...style }}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [filter:saturate(1.4)]"
      >
        {bands.map((b, i) => (
          <span
            key={i}
            className="pb-aurora absolute h-[60vmax] w-[60vmax] rounded-full opacity-60 mix-blend-screen"
            style={{
              top: b.top,
              left: b.left,
              background: `radial-gradient(circle at center, ${b.c} 0%, transparent 60%)`,
              filter: `blur(${blur})`,
              animation: `pb-aurora-drift ${speed}s ease-in-out ${b.delay} infinite`,
            }}
          />
        ))}
      </div>

      {grain && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default AuroraBackground;
