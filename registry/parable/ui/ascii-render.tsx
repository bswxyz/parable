"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** SSR-safe reduced-motion hook: false on the server and first client paint. */
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

/** Brightness ramp, darkest → brightest. Index by field value in [0,1). */
const RAMP = " .:-=+*#%@";

export interface AsciiRenderProps
  extends React.HTMLAttributes<HTMLPreElement> {
  /** Grid rows. */
  rows?: number;
  /** Grid columns. */
  cols?: number;
  /** Glyph colour. Mirrors the site `--pb-violet` token. */
  color?: string;
  /** Flow speed multiplier. */
  speed?: number;
  /** Let the pointer push a bright ripple into the field. */
  pointerReactive?: boolean;
  /**
   * Accessible name. When set, the field is exposed as an image with this
   * label; otherwise it is decorative (`aria-hidden`).
   */
  label?: string;
}

/**
 * AsciiRender — a live ASCII-art field. Two octaves of drifting sine/ripple
 * noise are sampled per cell, mapped through a brightness ramp
 * (" .:-=+*#%@"), and drawn into a monospace `<pre>` on a single rAF loop that
 * pauses off-screen via IntersectionObserver. Optionally the pointer pushes a
 * bright radial ripple into the field. The first frame is computed
 * deterministically so server and client agree; under prefers-reduced-motion
 * that single frame is all that renders. Decorative by default — pass `label`
 * to expose it as an image.
 *
 * Default glyph colour mirrors the site's `--pb-violet` token.
 *
 * @parable/ascii-render
 */
export function AsciiRender({
  rows = 20,
  cols = 60,
  color = "#8b5cf6",
  speed = 1,
  pointerReactive = true,
  label,
  className,
  style,
  ...props
}: AsciiRenderProps) {
  const reduced = usePrefersReducedMotion();
  const preRef = React.useRef<HTMLPreElement | null>(null);
  const pointer = React.useRef({ x: -1, y: -1, active: false });

  /** Deterministic field sampler — pure function of cell + time. */
  const sample = React.useCallback(
    (c: number, r: number, t: number): number => {
      const nx = c / cols;
      const ny = r / rows;
      // two drifting octaves + a slow diagonal wave
      let v =
        Math.sin(nx * 6.283 + t) * 0.5 +
        Math.sin((ny * 4.2 - t * 0.6) * 1.3) * 0.3 +
        Math.sin((nx + ny) * 5.1 + t * 0.4) * 0.2;
      // pointer ripple
      const p = pointer.current;
      if (p.active) {
        const dx = nx - p.x;
        const dy = ny - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        v += Math.max(0, 1 - d * 4) * Math.sin(d * 24 - t * 4) * 0.8;
      }
      return (v + 1) / 2; // → [0,1)
    },
    [cols, rows]
  );

  const frame = React.useCallback(
    (t: number): string => {
      const lines: string[] = [];
      for (let r = 0; r < rows; r++) {
        let line = "";
        for (let c = 0; c < cols; c++) {
          const v = Math.min(0.999, Math.max(0, sample(c, r, t)));
          line += RAMP[Math.floor(v * RAMP.length)];
        }
        lines.push(line);
      }
      return lines.join("\n");
    },
    [rows, cols, sample]
  );

  // Deterministic first frame (t = 0) — identical on server and client.
  const initial = React.useMemo(() => frame(0), [frame]);

  React.useEffect(() => {
    const el = preRef.current;
    if (!el || reduced) return;

    let raf = 0;
    let start = 0;
    let visible = true;

    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([e]) => {
              visible = e.isIntersecting;
              if (visible && !raf) raf = requestAnimationFrame(loop);
            },
            { threshold: 0 }
          )
        : null;
    io?.observe(el);

    function loop(now: number) {
      if (!start) start = now;
      const t = ((now - start) / 1000) * speed;
      el!.textContent = frame(t);
      if (visible && document.visibilityState === "visible") {
        raf = requestAnimationFrame(loop);
      } else {
        raf = 0;
      }
    }

    const onVis = () => {
      if (document.visibilityState === "visible" && visible && !raf) {
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [frame, speed, reduced]);

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLPreElement>) => {
      if (!pointerReactive || reduced) return;
      const rect = e.currentTarget.getBoundingClientRect();
      pointer.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
        active: true,
      };
    },
    [pointerReactive, reduced]
  );

  const onPointerLeave = React.useCallback(() => {
    pointer.current.active = false;
  }, []);

  return (
    <pre
      ref={preRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "select-none overflow-hidden whitespace-pre font-mono leading-[1.05] tracking-[0.06em]",
        className
      )}
      style={{
        color,
        fontSize: "clamp(6px, 1.4vw, 12px)",
        ...style,
      }}
      {...props}
    >
      {initial}
    </pre>
  );
}

export default AsciiRender;
