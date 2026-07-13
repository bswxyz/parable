"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Round a float to 3 decimals — full-precision floats trip React hydration. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Clamp `n` into the inclusive `[lo, hi]` range. */
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/**
 * Deterministic 0..1 hash of a scalar seed. Pure and stable, so the same
 * `count` yields the same layout on the server and the client — no
 * `Math.random()` during render, no hydration mismatch.
 */
function hash01(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/**
 * Return a fully transparent version of `color` that keeps its RGB, so radial
 * blobs fade to alpha 0 without the black halo `transparent` (rgba 0,0,0,0)
 * would smear through the gooey blur.
 */
function toTransparent(color: string): string {
  const h = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(h)) return h + "00";
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    const [r, g, b] = [h[1], h[2], h[3]];
    return `#${r}${r}${g}${g}${b}${b}00`;
  }
  // rgb()/hsl()/named — relative color syntax preserves the hue at alpha 0.
  return `rgb(from ${h} r g b / 0)`;
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

interface BlobCfg {
  x: number; // base centre, % of width
  y: number; // base centre, % of height
  size: number; // diameter, % of width
  color: string;
  transparent: string;
  amp: number; // drift radius, fraction of the container's short side
  fx: number; // drift angular frequency (rad/s), x
  fy: number; // drift angular frequency (rad/s), y
  phx: number; // drift phase, x
  phy: number; // drift phase, y
  fs: number; // scale-pulse frequency
  phs: number; // scale-pulse phase
  sAmp: number; // scale-pulse amplitude
  baseScale: number; // resting scale — organic size variety, also the static frame
  pull: number; // pointer attraction strength
}

/** Build a deterministic set of blob configs from `count` and `colors`. */
function buildBlobs(count: number, colors: string[]): BlobCfg[] {
  const n = clamp(Math.round(count), 1, 12);
  const palette = colors.length ? colors : ["#8b5cf6"];
  const out: BlobCfg[] = [];
  for (let i = 0; i < n; i++) {
    const color = palette[i % palette.length];
    out.push({
      x: r3(18 + hash01(i * 1.7 + 0.3) * 64),
      y: r3(20 + hash01(i * 2.3 + 5.1) * 60),
      size: r3(30 + hash01(i * 3.1 + 9.4) * 26),
      color,
      transparent: toTransparent(color),
      amp: 0.04 + hash01(i * 4.9 + 2.2) * 0.05,
      fx: 0.12 + hash01(i * 5.3 + 7.7) * 0.16,
      fy: 0.12 + hash01(i * 6.1 + 3.9) * 0.16,
      phx: hash01(i * 7.7 + 1.1) * Math.PI * 2,
      phy: hash01(i * 8.9 + 4.4) * Math.PI * 2,
      fs: 0.1 + hash01(i * 9.3 + 6.6) * 0.12,
      phs: hash01(i * 10.1 + 8.8) * Math.PI * 2,
      sAmp: 0.04 + hash01(i * 11.9 + 2.7) * 0.06,
      baseScale: r3(0.9 + hash01(i * 12.7 + 5.5) * 0.28),
      pull: 0.08 + hash01(i * 13.3 + 9.1) * 0.09,
    });
  }
  return out;
}

export interface LiquidBlobsProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Colours the blobs cycle through. Defaults to violet / fuchsia / ember. */
  colors?: string[];
  /** Backdrop colour behind the blobs. Mirrors the site `--pb-ink` token. */
  background?: string;
  /** How many blobs to render (clamped 1–12). */
  count?: number;
  /** Drift-speed multiplier. `1` is a slow, hero-grade flow; `0` freezes it. */
  speed?: number;
}

/**
 * LiquidBlobs — a gooey metaball hero backdrop. Several soft radial blobs drift
 * on slow, autonomous sine orbits and lean gently toward the pointer; where
 * they overlap they fuse like liquid via the SVG gooey-filter trick (a wide
 * `feGaussianBlur` spreads each blob's alpha, then an alpha-contrast
 * `feColorMatrix` re-thresholds it, welding neighbours into one skin). Motion
 * is a single rAF loop writing GPU-only `translate3d`/`scale` — the blur radius
 * tracks the container so the goo reads the same at any size, and an
 * IntersectionObserver idles the loop off-screen. Layout is derived from a
 * deterministic hash of `count`, so the server and first client render match;
 * under `prefers-reduced-motion` the blobs settle into that static, still-merged
 * arrangement with no drift. The blob layer is `aria-hidden`; content renders
 * above through a relative `z-10` wrapper.
 *
 * Default palette (violet #8b5cf6 / fuchsia #ec4899 / ember #f5a623 on ink
 * #0f0f10) mirrors the site's `--pb-*` tokens.
 *
 * @parable/liquid-blobs
 */
export function LiquidBlobs({
  colors = ["#8b5cf6", "#ec4899", "#f5a623"],
  background = "#0f0f10",
  count = 5,
  speed = 1,
  className,
  children,
  style,
  ...props
}: LiquidBlobsProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const blurRef = React.useRef<SVGFEGaussianBlurElement | null>(null);
  const blobEls = React.useRef<Array<HTMLDivElement | null>>([]);
  const reduced = usePrefersReducedMotion();

  const rawId = React.useId();
  const filterId = `pb-liquid-blobs-goo-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  const colorKey = colors.join("|");
  const blobs = React.useMemo(
    () => buildBlobs(count, colors),
    // colorKey stands in for `colors`; buildBlobs only reads its values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, colorKey]
  );

  // Live knob the rAF loop reads without tearing down its observers.
  const speedRef = React.useRef(speed);
  speedRef.current = speed;

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const size = { w: root.clientWidth || 1, h: root.clientHeight || 1 };
    const measure = () => {
      size.w = root.clientWidth || 1;
      size.h = root.clientHeight || 1;
      const blur = blurRef.current;
      if (blur) {
        const sd = clamp(Math.min(size.w, size.h) * 0.028, 6, 44);
        blur.setAttribute("stdDeviation", String(r3(sd)));
      }
    };
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    measure();

    // Reduced motion: keep the static, hash-derived resting frame.
    if (reduced) {
      return () => ro.disconnect();
    }

    // Per-blob pointer springs, integrated in the loop.
    const springs = blobs.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 }));
    const pointer = { x: 0.5, y: 0.5, active: false };
    const STIFFNESS = 120;
    const DAMPING = 16;

    let raf = 0;
    let visible = true;
    let last = performance.now();
    const start = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) {
        last = now;
        return;
      }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = ((now - start) / 1000) * speedRef.current;
      const short = Math.min(size.w, size.h);
      const decay = Math.exp(-DAMPING * dt);

      for (let i = 0; i < blobs.length; i++) {
        const el = blobEls.current[i];
        if (!el) continue;
        const b = blobs[i];
        const spr = springs[i];

        const r = short * b.amp;
        const dx = r * Math.sin(t * b.fx + b.phx);
        const dy = r * Math.cos(t * b.fy + b.phy);

        let tx = 0;
        let ty = 0;
        if (pointer.active) {
          const bcx = (b.x / 100) * size.w;
          const bcy = (b.y / 100) * size.h;
          tx = (pointer.x * size.w - bcx) * b.pull;
          ty = (pointer.y * size.h - bcy) * b.pull;
        }
        spr.vx += (tx - spr.x) * STIFFNESS * dt;
        spr.vy += (ty - spr.y) * STIFFNESS * dt;
        spr.vx *= decay;
        spr.vy *= decay;
        spr.x += spr.vx * dt;
        spr.y += spr.vy * dt;

        const s = b.baseScale + b.sAmp * Math.sin(t * b.fs + b.phs);
        el.style.transform =
          `translate(-50%, -50%) translate3d(${r3(dx + spr.x)}px, ` +
          `${r3(dy + spr.y)}px, 0) scale(${r3(s)})`;
      }
    };

    const onMove = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      pointer.y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };

    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    });
    io.observe(root);

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, blobs]);

  return (
    <div
      ref={rootRef}
      className={cn("relative overflow-hidden", className)}
      style={{ background, ...style }}
      {...props}
    >
      <svg
        aria-hidden
        className="pointer-events-none absolute h-0 w-0"
        focusable="false"
      >
        <defs>
          <filter
            id={filterId}
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur
              ref={blurRef}
              in="SourceGraphic"
              stdDeviation="20"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 17 -7"
            />
          </filter>
        </defs>
      </svg>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ filter: `url(#${filterId})` }}
      >
        {blobs.map((b, i) => (
          <div
            key={i}
            ref={(el) => {
              blobEls.current[i] = el;
            }}
            className="absolute rounded-full"
            style={{
              left: `${b.x}%`,
              top: `${b.y}%`,
              width: `${b.size}%`,
              aspectRatio: "1",
              transform: `translate(-50%, -50%) scale(${b.baseScale})`,
              background: `radial-gradient(circle at 50% 50%, ${b.color} 0%, ${b.color} 26%, ${b.transparent} 70%)`,
              willChange: "transform",
            }}
          />
        ))}
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default LiquidBlobs;
