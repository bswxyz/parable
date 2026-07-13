"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Tracks `prefers-reduced-motion`, updating live if the user flips it. */
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

/* --- Non-linear easings for the hot path (no linear tweens). --- */
const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
};
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

/* Lifecycle of one spawned image, in milliseconds. */
const APPEAR = 260;
const HOLD = 220;
const FADE = 520;
const LIFE = APPEAR + HOLD + FADE;
/** Upward drift, in px, applied across the fade-out for a floaty exit. */
const DRIFT = 16;

/** Per-node animation state. Lives in a ref — never touches React state. */
interface Slot {
  active: boolean;
  /** performance.now() timestamp of the spawn. */
  born: number;
  /** Center position within the container, in px. */
  x: number;
  y: number;
  /** Deterministic rotation for this spawn, in degrees. */
  rot: number;
  /** Deterministic base scale multiplier for this spawn. */
  base: number;
}

export interface CursorImageTrailProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Image URLs cycled through as the trail spawns. Required, non-empty. */
  images: string[];
  /** Maximum images alive at once; the oldest gracefully retires past it. */
  maxVisible?: number;
  /** Pointer travel, in px, between spawns. Larger = sparser trail. */
  spawnDistance?: number;
}

/**
 * CursorImageTrail — a hover region that leaves a trail of images chasing the
 * cursor. As the pointer travels across the container, images from `images`
 * pop in at pointer positions (throttled by `spawnDistance`), then fade and
 * scale out a moment later; because each spawns on its own clock, their exits
 * stagger naturally. The whole thing is driven imperatively — a recycled pool
 * of `<img>` nodes moved via a single rAF loop writing `transform`/`opacity`,
 * so there is zero per-frame React state churn. The loop idles itself when no
 * image is alive. Rotations and scales are derived deterministically from a
 * spawn counter (no `Math.random`), so server and client markup agree.
 *
 * The effect is chromatically neutral — your provided imagery leads — so it
 * exposes no colour props; the neutral ring/shadow read on any art. It slots
 * alongside the site's `--pb-*` tokened components (violet #8b5cf6, fuchsia
 * #ec4899, ember #f5a623, signal cyan #22d3ee on ink #0f0f10). Decorative
 * layers are `aria-hidden`; `children` render above and stay fully
 * interactive. Under `prefers-reduced-motion` the trail is disabled entirely
 * and only `children` render.
 *
 * @parable/cursor-image-trail
 */
export function CursorImageTrail({
  images,
  maxVisible = 10,
  spawnDistance = 48,
  className,
  children,
  ...props
}: CursorImageTrailProps) {
  const reduced = usePrefersReducedMotion();
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const elsRef = React.useRef<(HTMLImageElement | null)[]>([]);

  const hasImages = images.length > 0;
  const cap = Math.max(1, Math.floor(maxVisible));
  const distance = Math.max(1, spawnDistance);
  // One node per image at minimum so every image gets a stable, preloaded
  // `src`; grow the pool to `cap` so the trail can be denser than the set.
  const poolSize = hasImages ? Math.max(cap, images.length) : 0;
  const imagesKey = images.join("|");

  React.useEffect(() => {
    const root = rootRef.current;
    if (reduced || !hasImages || !root) return;

    const els = elsRef.current;
    const slots: Slot[] = Array.from({ length: poolSize }, () => ({
      active: false,
      born: 0,
      x: 0,
      y: 0,
      rot: 0,
      base: 1,
    }));

    let raf = 0;
    let spawns = 0;
    let z = 0;
    let acc = 0;
    let last: { x: number; y: number } | null = null;

    const tick = (now: number) => {
      let alive = false;
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        const el = els[i];
        if (!s.active || !el) continue;
        const e = now - s.born;
        if (e >= LIFE) {
          s.active = false;
          el.style.opacity = "0";
          continue;
        }
        alive = true;

        let scale: number;
        let opacity: number;
        let dy = 0;
        if (e < APPEAR) {
          const t = e / APPEAR;
          scale = 0.4 + 0.6 * easeOutBack(t);
          opacity = easeOutCubic(clamp01(e / (APPEAR * 0.55)));
        } else if (e < APPEAR + HOLD) {
          scale = 1;
          opacity = 1;
        } else {
          const t = clamp01((e - APPEAR - HOLD) / FADE);
          const k = easeInOutCubic(t);
          scale = 1 - 0.28 * k;
          opacity = 1 - k;
          dy = -DRIFT * k;
        }
        scale *= s.base;

        el.style.opacity = opacity.toFixed(3);
        el.style.transform =
          `translate(${s.x.toFixed(1)}px, ${(s.y + dy).toFixed(2)}px) ` +
          `scale(${scale.toFixed(3)}) rotate(${s.rot.toFixed(2)}deg) ` +
          `translate(-50%, -50%)`;
      }
      raf = alive ? requestAnimationFrame(tick) : 0;
    };

    const spawn = (x: number, y: number) => {
      const now = performance.now();
      const idx = spawns % slots.length;
      const s = slots[idx];
      s.active = true;
      s.born = now;
      s.x = x;
      s.y = y;
      // Deterministic per-spawn variety — no Math.random in render or here.
      s.rot = ((spawns * 53) % 15) - 7;
      s.base = 0.94 + ((spawns * 29) % 13) / 100;
      spawns += 1;

      const el = els[idx];
      if (el) el.style.zIndex = String((z += 1));

      // Enforce the visible cap: push the oldest still-appearing/holding node
      // into its fade so it exits gracefully rather than snapping away.
      let live = 0;
      for (const slot of slots) if (slot.active) live += 1;
      if (live > cap) {
        let oldest: Slot | null = null;
        for (const slot of slots) {
          if (slot === s || !slot.active) continue;
          if (!oldest || slot.born < oldest.born) oldest = slot;
        }
        if (oldest) oldest.born = Math.min(oldest.born, now - APPEAR - HOLD);
      }

      if (!raf) raf = requestAnimationFrame(tick);
    };

    const onEnter = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      last = { x: e.clientX - r.left, y: e.clientY - r.top };
      acc = 0;
    };
    const onMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (!last) {
        last = { x, y };
        return;
      }
      acc += Math.hypot(x - last.x, y - last.y);
      last = { x, y };
      if (acc >= distance) {
        acc = 0;
        spawn(x, y);
      }
    };
    const onLeave = () => {
      last = null;
      acc = 0;
    };

    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      for (const el of els) {
        if (!el) continue;
        el.style.opacity = "0";
      }
    };
  }, [reduced, hasImages, poolSize, cap, distance, imagesKey]);

  return (
    <div
      ref={rootRef}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      {!reduced && hasImages && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {Array.from({ length: poolSize }, (_, i) => (
            <img
              key={i}
              ref={(node) => {
                elsRef.current[i] = node;
              }}
              src={images[i % images.length]}
              alt=""
              draggable={false}
              className={cn(
                "absolute left-0 top-0 h-32 w-28 origin-top-left select-none",
                "rounded-2xl object-cover shadow-2xl ring-1 ring-black/10",
                "will-change-transform"
              )}
              style={{
                opacity: 0,
                transform: "translate(-50%, -50%) scale(0.4)",
              }}
            />
          ))}
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default CursorImageTrail;
