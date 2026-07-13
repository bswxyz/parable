"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

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

export interface GravityDotsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Fixed row count. Omit to derive from container height. */
  rows?: number;
  /** Fixed column count. Omit to derive from container width. */
  cols?: number;
  /** Dot colour. Default mirrors the site's `--pb-violet` token. */
  color?: string;
  /** Dot radius in px. */
  dotSize?: number;
  /** Pointer influence radius in px. */
  radius?: number;
  /** Force multiplier — 1 is the tuned default, 2 pulls twice as hard. */
  strength?: number;
  /** Whether the pointer pulls dots in or pushes them away. */
  mode?: "attract" | "repel";
}

/**
 * GravityDots — a canvas-2D dot grid the pointer bends: dots inside `radius`
 * are attracted (or repelled) and spring back home with damped overshoot,
 * stretching into short capsules along their velocity while they move. One
 * rAF loop that sleeps when the field settles, when the element is offscreen
 * (IntersectionObserver) and when the tab is hidden. DPR-aware (capped at 2x)
 * for crisp dots; fully cleaned up on unmount. Renders a static grid with no
 * physics under `prefers-reduced-motion`. The canvas layer is decorative and
 * `aria-hidden`; children render above it.
 *
 * @parable/gravity-dots
 */
export function GravityDots({
  rows,
  cols,
  color = "#8b5cf6",
  dotSize = 2,
  radius = 140,
  strength = 1,
  mode = "attract",
  className,
  children,
  ...props
}: GravityDotsProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  React.useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /** Spring stiffness toward each dot's home cell (unit mass, px/s²). */
    const SPRING = 190;
    /** Velocity damping — ~0.58 of critical, so return trips overshoot a touch. */
    const DAMPING = 16;
    /** Peak pointer acceleration at zero distance, before falloff. */
    const FORCE = 9000 * strength;
    const MAX_SPEED = 1100;
    const TAU = Math.PI * 2;
    const dir = mode === "repel" ? -1 : 1;

    let width = 0;
    let height = 0;
    /** Dot state, stride 6: homeX homeY x y vx vy. */
    let dots = new Float32Array(0);

    let px = 0;
    let py = 0;
    let pointerNear = false;

    let raf = 0;
    let running = false;
    let onscreen = true;

    const buildGrid = () => {
      width = wrap.clientWidth;
      height = wrap.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const spacing = Math.max(dotSize * 6, 26);
      const c = Math.max(1, cols ?? Math.round(width / spacing));
      const r = Math.max(1, rows ?? Math.round(height / spacing));
      dots = new Float32Array(c * r * 6);
      const gapX = width / c;
      const gapY = height / r;
      let o = 0;
      for (let j = 0; j < r; j++) {
        for (let i = 0; i < c; i++) {
          const hx = gapX * (i + 0.5);
          const hy = gapY * (j + 0.5);
          dots[o] = hx;
          dots[o + 1] = hy;
          dots[o + 2] = hx;
          dots[o + 3] = hy;
          o += 6;
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineCap = "round";
      ctx.lineWidth = dotSize * 2;
      for (let o = 0; o < dots.length; o += 6) {
        const x = dots[o + 2];
        const y = dots[o + 3];
        const vx = dots[o + 4];
        const vy = dots[o + 5];

        let alpha = 0.45;
        if (pointerNear) {
          const d = Math.hypot(px - x, py - y);
          if (d < radius) alpha += 0.5 * (1 - d / radius);
        }
        ctx.globalAlpha = alpha;

        const speed = Math.hypot(vx, vy);
        const stretch = Math.min(speed * 0.045, 15);
        if (stretch > 0.75) {
          // Capsule along the velocity vector: round-capped stroke whose
          // length scales with speed, so fast dots visibly smear.
          const k = stretch / (speed * 2);
          ctx.beginPath();
          ctx.moveTo(x - vx * k, y - vy * k);
          ctx.lineTo(x + vx * k, y + vy * k);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, TAU);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    /** Semi-implicit Euler step. Returns false once the whole field is at rest. */
    const physics = (dt: number): boolean => {
      const damp = Math.exp(-DAMPING * dt);
      let live = pointerNear;
      for (let o = 0; o < dots.length; o += 6) {
        const hx = dots[o];
        const hy = dots[o + 1];
        let x = dots[o + 2];
        let y = dots[o + 3];
        let vx = dots[o + 4];
        let vy = dots[o + 5];

        let ax = (hx - x) * SPRING;
        let ay = (hy - y) * SPRING;

        if (pointerNear) {
          const dx = px - x;
          const dy = py - y;
          const d = Math.hypot(dx, dy);
          if (d < radius && d > 0.001) {
            const fall = 1 - d / radius;
            // In attract mode, fade the force near the centre so captured
            // dots settle into orbit instead of thrashing across the pointer.
            const soft = dir > 0 ? Math.min(d / 28, 1) : 1;
            const f = (FORCE * fall * fall * soft * dir) / d;
            ax += dx * f;
            ay += dy * f;
          }
        }

        vx = (vx + ax * dt) * damp;
        vy = (vy + ay * dt) * damp;
        const sp = Math.hypot(vx, vy);
        if (sp > MAX_SPEED) {
          vx = (vx / sp) * MAX_SPEED;
          vy = (vy / sp) * MAX_SPEED;
        }
        x += vx * dt;
        y += vy * dt;

        if (!live && (sp > 1 || Math.abs(x - hx) > 0.05 || Math.abs(y - hy) > 0.05))
          live = true;

        dots[o + 2] = x;
        dots[o + 3] = y;
        dots[o + 4] = vx;
        dots[o + 5] = vy;
      }
      return live;
    };

    let last = 0;
    const step = (t: number) => {
      raf = 0;
      const dt = Math.min(Math.max((t - last) / 1000, 0), 1 / 30) || 1 / 60;
      last = t;
      const live = physics(dt);
      draw();
      if (live) raf = requestAnimationFrame(step);
      else running = false;
    };

    const wake = () => {
      if (running || !onscreen || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(step);
    };

    const sleep = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      running = false;
    };

    buildGrid();
    draw();

    if (reduced) {
      // Static, legible fallback: grid only, no physics, no listeners.
      const ro = new ResizeObserver(() => {
        buildGrid();
        draw();
      });
      ro.observe(wrap);
      return () => ro.disconnect();
    }

    const updatePointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      px = e.clientX - rect.left;
      py = e.clientY - rect.top;
      pointerNear =
        px > -radius &&
        py > -radius &&
        px < rect.width + radius &&
        py < rect.height + radius;
      if (pointerNear) wake();
    };
    const clearPointer = () => {
      if (!pointerNear) return;
      pointerNear = false;
      wake(); // let displaced dots spring home, then the loop self-sleeps
    };
    const onPointerOut = (e: PointerEvent) => {
      if (!e.relatedTarget) clearPointer();
    };
    const onVisibility = () => {
      if (document.hidden) sleep();
      else wake();
    };

    window.addEventListener("pointermove", updatePointer, { passive: true });
    window.addEventListener("pointerdown", updatePointer, { passive: true });
    window.addEventListener("pointerout", onPointerOut, { passive: true });
    window.addEventListener("blur", clearPointer);
    document.addEventListener("visibilitychange", onVisibility);

    const ro = new ResizeObserver(() => {
      buildGrid();
      draw();
      wake();
    });
    ro.observe(wrap);

    const io = new IntersectionObserver((entries) => {
      onscreen = entries[0]?.isIntersecting ?? true;
      if (onscreen) wake();
      else sleep();
    });
    io.observe(wrap);

    return () => {
      sleep();
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", updatePointer);
      window.removeEventListener("pointerdown", updatePointer);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("blur", clearPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [rows, cols, color, dotSize, radius, strength, mode, reduced]);

  return (
    <div
      ref={wrapRef}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default GravityDots;
