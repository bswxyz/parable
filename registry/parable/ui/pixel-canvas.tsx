"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Inject a <style> block once per unique id (SSR-safe, idempotent). */
function useInjectedKeyframes(id: string, css: string) {
  React.useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/** Clamp `n` into the inclusive `[lo, hi]` range. */
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/**
 * Deterministic 0..1 hash of a scalar seed. Pure and stable, so the same grid
 * cell always draws the same colour — no `Math.random()`, no seed captured at
 * render time, nothing that could drift between the server and first client
 * paint.
 */
function hash01(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/** Track prefers-reduced-motion reactively (defaults to false on the server). */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/** One cell of the grid. `t` runs 0 (faint base) → 1 (fully lit). */
interface Pixel {
  cx: number; // centre x, CSS px
  cy: number; // centre y, CSS px
  color: string;
  jit: number; // deterministic per-pixel speed jitter, ~0.7..1.4
  t: number; // current lit fraction
  delay: number; // ms before this pixel starts easing (set per transition)
}

export interface PixelCanvasProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Colours the pixels are seeded from. Defaults to the brand set violet
   * `#8b5cf6` / fuchsia `#ec4899` / ember `#f5a623` / signal `#22d3ee`
   * (mirrors the site's `--pb-*` tokens).
   */
  colors?: string[];
  /** Space between pixels in CSS px. */
  gap?: number;
  /** Edge length of each lit pixel in CSS px. */
  pixelSize?: number;
  /** Ripple/ease-speed multiplier. `1` is the default cadence; `0.1`–`8`. */
  speed?: number;
}

const BASE_ALPHA = 0.14; // resting opacity of an unlit pixel
const BASE_SCALE = 0.52; // resting size fraction of an unlit pixel
const MAX_PIXELS = 4000; // guard against pathological gap/pixelSize combos

/**
 * PixelCanvas — a decorative grid of pixels that ripples to life on
 * hover/focus. A single `<canvas>` draws a faint, deterministic pixel field at
 * rest; when the pointer enters (or a child receives focus) the pixels light
 * up — growing in size and opacity — staggered by their distance from the
 * cursor so the glow radiates outward, then settles back down when the pointer
 * leaves or focus moves away. Each pixel eases exponentially toward its target
 * (no linear ramps) with a small deterministic per-pixel speed jitter for an
 * organic shimmer. Colour and jitter come from a pure hash of the cell index,
 * so the server and first client render agree and nothing is random at render
 * time. A single rAF loop runs only while pixels are in motion and is idled
 * off-screen by an IntersectionObserver; a ResizeObserver rebuilds the grid on
 * resize with device-pixel-ratio scaling. Under `prefers-reduced-motion` the
 * canvas paints the static faint field once and skips every ripple. The canvas
 * is `aria-hidden` and `pointer-events-none`; content renders above through a
 * relative `z-10` wrapper, and focus within that content triggers the effect so
 * it stays keyboard-operable.
 *
 * Default palette (violet `#8b5cf6` / fuchsia `#ec4899` / ember `#f5a623` /
 * signal `#22d3ee` on ink `#0f0f10`) mirrors the site's `--pb-*` tokens.
 *
 * @parable/pixel-canvas
 */
export function PixelCanvas({
  colors = ["#8b5cf6", "#ec4899", "#f5a623", "#22d3ee"],
  gap = 6,
  pixelSize = 8,
  speed = 1,
  className,
  children,
  ...props
}: PixelCanvasProps) {
  useInjectedKeyframes(
    "pb-pixel-canvas-kf",
    ".pb-pixel-canvas-fade{animation:pb-pixel-canvas-in .6s cubic-bezier(.22,1,.36,1) both}" +
      "@keyframes pb-pixel-canvas-in{from{opacity:0}to{opacity:1}}" +
      "@media (prefers-reduced-motion:reduce){.pb-pixel-canvas-fade{animation:none}}"
  );

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const reduced = usePrefersReducedMotion();

  // Live knobs the rAF loop reads without tearing down its observers.
  const speedRef = React.useRef(speed);
  speedRef.current = speed;

  const colorsKey = colors.join("|");

  React.useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const palette = colors.length ? colors : ["#8b5cf6"];
    const cell = Math.max(2, pixelSize) + Math.max(0, gap);

    let pixels: Pixel[] = [];
    const state = {
      cssW: 0,
      cssH: 0,
      mode: null as "in" | "out" | null,
      start: 0, // performance.now() of the current transition
      last: 0, // previous frame time, for dt
      rafId: 0,
      visible: true,
      hover: false,
      focus: false,
    };

    const drawPixel = (p: Pixel) => {
      const size = pixelSize * (BASE_SCALE + (1 - BASE_SCALE) * p.t);
      // Square the fraction so the lit pop reads brighter than a linear fade.
      const alpha = BASE_ALPHA + (1 - BASE_ALPHA) * p.t * p.t;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.cx - size / 2, p.cy - size / 2, size, size);
    };

    const draw = () => {
      ctx.clearRect(0, 0, state.cssW, state.cssH);
      for (let i = 0; i < pixels.length; i++) drawPixel(pixels[i]);
      ctx.globalAlpha = 1;
    };

    const build = () => {
      const w = state.cssW;
      const h = state.cssH;
      let cols = Math.max(1, Math.floor((w + gap) / cell));
      let rows = Math.max(1, Math.floor((h + gap) / cell));
      if (cols * rows > MAX_PIXELS) {
        const f = Math.sqrt((cols * rows) / MAX_PIXELS);
        cols = Math.max(1, Math.floor(cols / f));
        rows = Math.max(1, Math.floor(rows / f));
      }
      const gridW = cols * cell - gap;
      const gridH = rows * cell - gap;
      const offX = (w - gridW) / 2;
      const offY = (h - gridH) / 2;
      const next: Pixel[] = [];
      for (let ry = 0; ry < rows; ry++) {
        for (let cxi = 0; cxi < cols; cxi++) {
          const seed = ry * 131.7 + cxi * 57.31;
          const idx = Math.floor(hash01(seed + 3.1) * palette.length);
          next.push({
            cx: offX + cxi * cell + pixelSize / 2,
            cy: offY + ry * cell + pixelSize / 2,
            color: palette[clamp(idx, 0, palette.length - 1)],
            jit: 0.7 + hash01(seed + 9.41) * 0.7,
            t: 0,
            delay: 0,
          });
        }
      }
      pixels = next;
    };

    const loop = (now: number) => {
      const target = state.mode === "in" ? 1 : 0;

      // Off-screen: finish instantly and stop — no animation nobody can see.
      if (!state.visible) {
        for (let i = 0; i < pixels.length; i++) pixels[i].t = target;
        draw();
        state.rafId = 0;
        return;
      }

      const dt = Math.min((now - state.last) / 1000, 0.05);
      state.last = now;
      const k = 10 * clamp(speedRef.current, 0.1, 8);
      const elapsed = now - state.start;

      let moving = false;
      for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i];
        if (elapsed >= p.delay) {
          const f = 1 - Math.exp(-k * p.jit * dt);
          p.t += (target - p.t) * f;
          if (Math.abs(target - p.t) < 0.004) p.t = target;
        }
        if (p.t !== target) moving = true;
      }
      draw();
      state.rafId = moving ? requestAnimationFrame(loop) : 0;
    };

    const ensureLoop = () => {
      if (!state.rafId) state.rafId = requestAnimationFrame(loop);
    };

    // Seed every pixel's start delay from its distance to (ox, oy) so the
    // transition radiates outward from the interaction point.
    const startTransition = (mode: "in" | "out", ox: number, oy: number) => {
      const now = performance.now();
      state.mode = mode;
      state.start = now;
      state.last = now;
      const factor = 0.85 / clamp(speedRef.current, 0.1, 8); // ms per px
      for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i];
        p.delay = Math.hypot(p.cx - ox, p.cy - oy) * factor;
      }
      ensureLoop();
    };

    const resize = () => {
      const w = root.clientWidth || 1;
      const h = root.clientHeight || 1;
      state.cssW = w;
      state.cssH = h;
      const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      if (reduced || (!state.hover && !state.focus)) {
        draw();
      } else {
        // Was active mid-resize — re-radiate from the centre of the new grid.
        startTransition("in", w / 2, h / 2);
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(root);
    resize();

    // Reduced motion: one static frame, no listeners, no loop.
    if (reduced) {
      return () => ro.disconnect();
    }

    const originFromEvent = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      return {
        x: clamp(e.clientX - rect.left, 0, state.cssW),
        y: clamp(e.clientY - rect.top, 0, state.cssH),
      };
    };

    const onEnter = (e: PointerEvent) => {
      state.hover = true;
      const o = originFromEvent(e);
      startTransition("in", o.x, o.y);
    };
    const onLeave = (e: PointerEvent) => {
      state.hover = false;
      if (state.focus) return;
      const o = originFromEvent(e);
      startTransition("out", o.x, o.y);
    };
    const onFocusIn = () => {
      state.focus = true;
      if (state.hover) return;
      startTransition("in", state.cssW / 2, state.cssH / 2);
    };
    const onFocusOut = (e: FocusEvent) => {
      const nextEl = e.relatedTarget as Node | null;
      if (nextEl && root.contains(nextEl)) return;
      state.focus = false;
      if (state.hover) return;
      startTransition("out", state.cssW / 2, state.cssH / 2);
    };

    const io = new IntersectionObserver((entries) => {
      const vis = entries[0]?.isIntersecting ?? true;
      state.visible = vis;
      if (vis && state.mode) ensureLoop();
    });
    io.observe(root);

    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);

    return () => {
      if (state.rafId) cancelAnimationFrame(state.rafId);
      ro.disconnect();
      io.disconnect();
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
    };
    // colorsKey stands in for `colors`; the effect only reads its values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, colorsKey, gap, pixelSize]);

  return (
    <div
      ref={rootRef}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full",
          !reduced && "pb-pixel-canvas-fade"
        )}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default PixelCanvas;
