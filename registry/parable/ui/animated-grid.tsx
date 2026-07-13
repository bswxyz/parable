"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Parse "#rgb" / "#rrggbb" into an `rgba()` string; falls back to violet. */
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = Number.parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return `rgba(139, 92, 246, ${alpha})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Deterministic PRNG so ambient cells are identical on server and client. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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

/** Inject one shared <style> tag (id-guarded) that owns this component's keyframes. */
function useInjectedKeyframes(id: string, css: string): void {
  React.useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

const KEYFRAMES = `
@keyframes pb-animated-grid-pulse {
  0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.55); }
  50% { opacity: var(--pb-ag-peak, 0.5); transform: translate(-50%, -50%) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  [data-pb-animated-grid-dot] { animation: none !important; opacity: 0 !important; }
}
`;

export interface AnimatedGridProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Edge length of one grid cell, in pixels. */
  cellSize?: number;
  /** Hex colour of the resting grid lines (drawn faintly). */
  lineColor?: string;
  /** Hex colour of the pointer spotlight and ambient cells. Mirrors `--pb-violet`. */
  glowColor?: string;
  /** Radius of the pointer spotlight, in pixels. */
  radius?: number;
  /** Slowly pulse a scattered, deterministic set of cells. */
  pulse?: boolean;
  /** How many ambient cells pulse when `pulse` is on. */
  pulseCount?: number;
  /** Foreground content, rendered above the grid via a `z-10` wrapper. */
  children?: React.ReactNode;
}

/**
 * AnimatedGrid — a hero backdrop of hairline grid cells with a soft radial
 * spotlight that tracks the pointer, brightening the lattice around the cursor.
 * Tracking is pure CSS: a `pointermove` listener writes the pointer position to
 * `--mx` / `--my` CSS variables (rAF-batched), and a masked bright-grid layer
 * plus a radial glow read those variables — there is no per-cell React state, so
 * cost is constant regardless of grid density. An optional ambient pass pulses a
 * random-but-deterministic (seeded PRNG) set of cells via injected keyframes, so
 * server and client render identically. Under `prefers-reduced-motion` the grid
 * is static with a single soft glow centred over it: no pointer tracking, no
 * pulse. The grid layers are `aria-hidden` and non-interactive. Default colours
 * (violet spotlight on a faint neutral grid) mirror the site's `--pb-*` tokens.
 *
 * @parable/animated-grid
 */
export function AnimatedGrid({
  cellSize = 32,
  lineColor = "#ffffff",
  glowColor = "#8b5cf6",
  radius = 200,
  pulse = true,
  pulseCount = 16,
  className,
  children,
  style,
  ...props
}: AnimatedGridProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const reduced = usePrefersReducedMotion();
  useInjectedKeyframes("pb-animated-grid-kf", KEYFRAMES);

  const line = hexToRgba(lineColor, 0.14);
  const glowLine = hexToRgba(glowColor, 0.6);
  const glowFill = hexToRgba(glowColor, 0.16);
  const glowCore = hexToRgba(glowColor, 0.3);

  const gridLines = `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`;
  const brightLines = `linear-gradient(to right, ${glowLine} 1px, transparent 1px), linear-gradient(to bottom, ${glowLine} 1px, transparent 1px)`;
  const spotlightMask = `radial-gradient(circle var(--pb-ag-r) at var(--mx) var(--my), #000 0%, rgba(0,0,0,0.6) 44%, transparent 76%)`;
  const glowRadial = `radial-gradient(circle var(--pb-ag-r) at var(--mx) var(--my), ${glowCore} 0%, ${glowFill} 32%, transparent 72%)`;

  const dots = React.useMemo(() => {
    const rnd = mulberry32(0x9e3779b9);
    const count = Math.max(0, Math.min(pulseCount, 60));
    return Array.from({ length: count }, () => ({
      x: Math.round(rnd() * 1000) / 10,
      y: Math.round(rnd() * 1000) / 10,
      dur: Math.round((3.5 + rnd() * 4) * 1000) / 1000,
      delay: Math.round(rnd() * 6 * 1000) / 1000,
      peak: Math.round((0.25 + rnd() * 0.4) * 1000) / 1000,
    }));
  }, [pulseCount]);

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    // Reduced motion: freeze a single soft glow centred over the static grid.
    if (reduced) {
      el.style.setProperty("--mx", "50%");
      el.style.setProperty("--my", "50%");
      el.style.setProperty("--pb-ag-active", "1");
      return;
    }

    let rect = el.getBoundingClientRect();
    let raf = 0;
    let px = 0;
    let py = 0;
    let pending = false;

    const apply = () => {
      pending = false;
      el.style.setProperty("--mx", `${px}px`);
      el.style.setProperty("--my", `${py}px`);
    };
    const schedule = () => {
      if (pending) return;
      pending = true;
      raf = requestAnimationFrame(apply);
    };
    const onMove = (e: PointerEvent) => {
      px = Math.round(e.clientX - rect.left);
      py = Math.round(e.clientY - rect.top);
      schedule();
    };
    const onEnter = (e: PointerEvent) => {
      rect = el.getBoundingClientRect();
      px = Math.round(e.clientX - rect.left);
      py = Math.round(e.clientY - rect.top);
      apply();
      el.style.setProperty("--pb-ag-active", "1");
    };
    const onLeave = () => el.style.setProperty("--pb-ag-active", "0");
    const onScroll = () => {
      rect = el.getBoundingClientRect();
    };

    const ro = new ResizeObserver(() => {
      rect = el.getBoundingClientRect();
    });
    ro.observe(el);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, [reduced]);

  const showPulse = pulse && !reduced;

  const rootStyle = {
    "--pb-ag-cell": `${cellSize}px`,
    "--pb-ag-r": `${radius}px`,
    "--pb-ag-active": 0,
    "--mx": "50%",
    "--my": "50%",
    ...style,
  } as React.CSSProperties;

  return (
    <div
      ref={rootRef}
      className={cn("relative isolate overflow-hidden", className)}
      style={rootStyle}
      {...props}
    >
      {/* Resting grid — always visible, faint. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: gridLines,
          backgroundSize: "var(--pb-ag-cell) var(--pb-ag-cell)",
        }}
      />

      {/* Soft radial spotlight fill that tracks the pointer. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{
          backgroundImage: glowRadial,
          opacity: "var(--pb-ag-active)",
        }}
      />

      {/* Bright grid, revealed only inside the spotlight via a radial mask. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{
          backgroundImage: brightLines,
          backgroundSize: "var(--pb-ag-cell) var(--pb-ag-cell)",
          WebkitMaskImage: spotlightMask,
          maskImage: spotlightMask,
          opacity: "var(--pb-ag-active)",
        }}
      />

      {/* Ambient pulsing cells — deterministic positions, no pointer needed. */}
      {showPulse && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          {dots.map((d, i) => (
            <span
              key={i}
              data-pb-animated-grid-dot
              className="absolute block rounded-[3px]"
              style={
                {
                  left: `${d.x}%`,
                  top: `${d.y}%`,
                  width: "var(--pb-ag-cell)",
                  height: "var(--pb-ag-cell)",
                  background: `radial-gradient(circle at center, ${glowCore} 0%, transparent 66%)`,
                  opacity: 0,
                  transform: "translate(-50%, -50%)",
                  animationName: "pb-animated-grid-pulse",
                  animationDuration: `${d.dur}s`,
                  animationDelay: `${d.delay}s`,
                  animationIterationCount: "infinite",
                  animationTimingFunction: "cubic-bezier(0.45, 0, 0.55, 1)",
                  "--pb-ag-peak": d.peak,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default AnimatedGrid;
