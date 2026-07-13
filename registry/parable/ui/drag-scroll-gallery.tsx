"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Mirror of the house reduced-motion hook: false on the server + first client
 * render (so hydration matches), then resolves from the media query. */
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

/** Hand-rolled physics constants — no linear easing on the hot path. */
const FRICTION = 3.2; // exponential velocity decay per second (glide)
const SNAP_STIFF = 190; // snap / spring-back stiffness
const SNAP_DAMP = 24; // snap / spring-back damping
const RUBBER = 0.42; // out-of-bounds drag resistance
const TAP_PX = 4; // movement under this reads as a click, not a drag
const FLICK_S = 0.12; // seconds of velocity projected when choosing a snap

interface EngineState {
  pos: number; // scroll position in px (0..max), may overshoot while dragging
  raw: number; // unbounded drag accumulator (mapped through rubber-band)
  vel: number; // velocity in px/s (position space)
  max: number; // maximum scroll position
  target: number | null; // active spring target (snap or bounds), else null
  snaps: number[]; // per-item position that centres that item
  dragging: boolean;
  lastX: number;
  lastT: number;
  moved: number;
  lastFrame: number;
  raf: number;
  wheelTO: number;
}

export interface DragScrollGalleryProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The cards / media to lay out horizontally. Each becomes a focusable list item. */
  items: React.ReactNode[];
  /** Space between items, in pixels. */
  gap?: number;
  /** Snap the nearest item to centre when a drag / flick / wheel settles. */
  snap?: boolean;
  /** Focus-ring colour. Mirrors the site's `--pb-violet` token. */
  accent?: string;
  /** How much edge items shrink (0 = flat, 0.16 ≈ 84% at the far edge). */
  scaleAmount?: number;
  /** Peak tilt in degrees applied to items as they pass the centre. */
  rotateAmount?: number;
}

/**
 * DragScrollGallery — a horizontal rail you throw with a pointer, a trackpad,
 * or the wheel. Drag builds velocity that decays through a hand-written
 * friction/inertia integrator (no library, no linear easing); past the ends it
 * rubber-bands and springs home. Items scale, tilt, and fade by their distance
 * from centre, giving depth as the rail moves — all driven imperatively per
 * frame, so React never re-renders on the hot path. With `snap`, a flick lands
 * the nearest item dead-centre via a spring. Fully keyboard operable: arrows /
 * Home / End move focus and glide the focused card into view; the cursor reads
 * grab → grabbing. Under `prefers-reduced-motion` it degrades to a plain
 * `overflow-x` scroller with CSS scroll-snap — no inertia, no scaling — while
 * staying `role="list"` with focusable items throughout.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (accent = violet #8b5cf6).
 *
 * @parable/drag-scroll-gallery
 */
export function DragScrollGallery({
  items,
  gap = 20,
  snap = false,
  accent = "#8b5cf6",
  scaleAmount = 0.16,
  rotateAmount = 6,
  className,
  style,
  ...rest
}: DragScrollGalleryProps) {
  const reduced = usePrefersReducedMotion();

  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const itemEls = React.useRef<(HTMLDivElement | null)[]>([]);
  const [dragging, setDragging] = React.useState(false);

  // Live knobs read inside the engine so prop tweaks don't tear it down.
  const live = React.useRef({ gap, snap, scaleAmount, rotateAmount });
  live.current.gap = gap;
  live.current.snap = snap;
  live.current.scaleAmount = scaleAmount;
  live.current.rotateAmount = rotateAmount;

  const state = React.useRef<EngineState>({
    pos: 0,
    raw: 0,
    vel: 0,
    max: 0,
    target: null,
    snaps: [],
    dragging: false,
    lastX: 0,
    lastT: 0,
    moved: 0,
    lastFrame: 0,
    raf: 0,
    wheelTO: 0,
  });

  const itemsLength = items.length;

  React.useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const s = state.current;
    itemEls.current.length = itemsLength;
    const now = () => performance.now();

    const moveFocus = (e: KeyboardEvent): number | null => {
      const n = itemEls.current.length;
      if (!n) return null;
      const idx = itemEls.current.findIndex(
        (el) => el === document.activeElement
      );
      let next = idx;
      if (e.key === "ArrowRight" || e.key === "ArrowDown")
        next = idx < 0 ? 0 : Math.min(n - 1, idx + 1);
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
        next = idx < 0 ? 0 : Math.max(0, idx - 1);
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = n - 1;
      else return null;
      e.preventDefault();
      return next;
    };

    // --- Reduced motion: native scroll owns everything, arrows move focus. ---
    if (reduced) {
      const onKey = (e: KeyboardEvent) => {
        const next = moveFocus(e);
        if (next == null) return;
        itemEls.current[next]?.focus(); // native scroll reveals it instantly
      };
      vp.addEventListener("keydown", onKey);
      return () => vp.removeEventListener("keydown", onKey);
    }

    // ------------------------------ Interactive ------------------------------
    const clampPos = (p: number) => Math.min(s.max, Math.max(0, p));
    const rubber = (v: number) => {
      if (v < 0) return v * RUBBER;
      if (v > s.max) return s.max + (v - s.max) * RUBBER;
      return v;
    };

    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      const vw = vp.clientWidth;
      s.max = Math.max(0, track.scrollWidth - vw);
      s.pos = clampPos(s.pos);
      s.snaps = itemEls.current.map((el) =>
        el
          ? Math.min(s.max, Math.max(0, el.offsetLeft + el.offsetWidth / 2 - vw / 2))
          : 0
      );
    };

    const apply = () => {
      const track = trackRef.current;
      if (!track) return;
      track.style.transform = `translate3d(${(-s.pos).toFixed(3)}px,0,0)`;
      const vw = vp.clientWidth || 1;
      const center = vw / 2;
      const { scaleAmount: sa, rotateAmount: ra } = live.current;
      const arr = itemEls.current;
      for (let i = 0; i < arr.length; i++) {
        const el = arr[i];
        if (!el) continue;
        const cx = el.offsetLeft + el.offsetWidth / 2 - s.pos;
        let nd = (cx - center) / center;
        if (nd > 1) nd = 1;
        else if (nd < -1) nd = -1;
        const dist = nd < 0 ? -nd : nd;
        el.style.transform = `rotate(${(nd * ra).toFixed(3)}deg) scale(${(
          1 -
          dist * sa
        ).toFixed(3)})`;
        el.style.opacity = (1 - dist * 0.4).toFixed(3);
        el.style.zIndex = String(500 - Math.round(dist * 500));
      }
    };

    const stop = () => {
      if (s.raf) cancelAnimationFrame(s.raf);
      s.raf = 0;
    };

    const frame = (t: number) => {
      const dt = Math.min((t - s.lastFrame) / 1000, 0.032);
      s.lastFrame = t;
      let done = false;
      if (s.target != null) {
        // Critically-ish damped spring toward a snap point or a bound.
        s.vel += (s.target - s.pos) * SNAP_STIFF * dt;
        s.vel *= Math.exp(-SNAP_DAMP * dt);
        s.pos += s.vel * dt;
        if (Math.abs(s.target - s.pos) < 0.4 && Math.abs(s.vel) < 8) {
          s.pos = s.target;
          s.vel = 0;
          s.target = null;
          done = true;
        }
      } else {
        // Free inertia with exponential friction; hand off to a spring at ends.
        s.pos += s.vel * dt;
        s.vel *= Math.exp(-FRICTION * dt);
        if (s.pos < 0 || s.pos > s.max) s.target = s.pos < 0 ? 0 : s.max;
        else if (Math.abs(s.vel) < 10) {
          s.vel = 0;
          done = true;
        }
      }
      apply();
      if (done) {
        s.raf = 0;
        return;
      }
      s.raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      stop();
      s.lastFrame = now();
      s.raf = requestAnimationFrame(frame);
    };

    const snapTo = (landing: number) => {
      let best = 0;
      let bd = Infinity;
      for (let i = 0; i < s.snaps.length; i++) {
        const d = Math.abs(s.snaps[i] - landing);
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      s.target = s.snaps.length ? s.snaps[best] : clampPos(landing);
    };

    const reveal = (idx: number) => {
      const el = itemEls.current[idx];
      if (!el) return;
      const left = el.offsetLeft - s.pos;
      const right = left + el.offsetWidth;
      if (left < 0 || right > vp.clientWidth || live.current.snap) {
        s.target = s.snaps[idx] ?? clampPos(el.offsetLeft + el.offsetWidth / 2 - vp.clientWidth / 2);
        kick();
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      s.dragging = true;
      setDragging(true);
      s.raw = s.pos;
      s.lastX = e.clientX;
      s.lastT = now();
      s.moved = 0;
      s.vel = 0;
      s.target = null;
      stop();
      try {
        vp.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best-effort */
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!s.dragging) return;
      const t = now();
      const dx = e.clientX - s.lastX;
      s.lastX = e.clientX;
      s.moved += Math.abs(dx);
      const dt = Math.max(1, t - s.lastT) / 1000;
      s.lastT = t;
      s.raw -= dx;
      s.pos = rubber(s.raw);
      s.vel = s.vel * 0.6 + (-dx / dt) * 0.4; // smoothed release velocity
      apply();
    };

    const onUp = (e: PointerEvent) => {
      if (!s.dragging) return;
      s.dragging = false;
      setDragging(false);
      try {
        vp.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (s.moved < TAP_PX) {
        // A click, not a throw — only settle if a rubber-band left us out of bounds.
        if (s.pos < 0 || s.pos > s.max) {
          s.target = clampPos(s.pos);
          kick();
        }
        return;
      }
      if (live.current.snap) snapTo(clampPos(s.pos + s.vel * FLICK_S));
      else s.target = s.pos < 0 || s.pos > s.max ? clampPos(s.pos) : null;
      kick();
    };

    const onWheel = (e: WheelEvent) => {
      if (s.max <= 0) return;
      const horiz = Math.abs(e.deltaX) >= Math.abs(e.deltaY);
      const delta = horiz ? e.deltaX : e.deltaY;
      const next = clampPos(s.pos + delta);
      if (next === s.pos) return; // at an edge — let the page scroll
      e.preventDefault();
      stop();
      s.target = null;
      s.vel = 0;
      s.pos = next;
      apply();
      if (live.current.snap) {
        clearTimeout(s.wheelTO);
        s.wheelTO = window.setTimeout(() => {
          snapTo(s.pos);
          kick();
        }, 140);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const next = moveFocus(e);
      if (next == null) return;
      itemEls.current[next]?.focus({ preventScroll: true });
      reveal(next);
    };

    const onFocusIn = (e: FocusEvent) => {
      const idx = itemEls.current.findIndex((el) => el === e.target);
      if (idx >= 0) reveal(idx);
    };

    const onDragStart = (e: Event) => e.preventDefault(); // kill native image ghost

    measure();
    apply();

    vp.addEventListener("pointerdown", onDown);
    vp.addEventListener("pointermove", onMove);
    vp.addEventListener("pointerup", onUp);
    vp.addEventListener("pointercancel", onUp);
    vp.addEventListener("wheel", onWheel, { passive: false });
    vp.addEventListener("keydown", onKey);
    vp.addEventListener("focusin", onFocusIn);
    vp.addEventListener("dragstart", onDragStart);

    const ro = new ResizeObserver(() => {
      measure();
      apply();
    });
    ro.observe(vp);
    if (trackRef.current) ro.observe(trackRef.current);

    return () => {
      stop();
      clearTimeout(s.wheelTO);
      ro.disconnect();
      vp.removeEventListener("pointerdown", onDown);
      vp.removeEventListener("pointermove", onMove);
      vp.removeEventListener("pointerup", onUp);
      vp.removeEventListener("pointercancel", onUp);
      vp.removeEventListener("wheel", onWheel);
      vp.removeEventListener("keydown", onKey);
      vp.removeEventListener("focusin", onFocusIn);
      vp.removeEventListener("dragstart", onDragStart);
    };
  }, [reduced, itemsLength]);

  const styleVars = { "--pb-dsg-accent": accent } as React.CSSProperties;

  const itemClass = cn(
    "shrink-0 origin-center rounded-2xl outline-none",
    "focus-visible:ring-2 focus-visible:ring-[var(--pb-dsg-accent)]",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
  );

  // ------------------------------- Reduced -------------------------------
  if (reduced) {
    return (
      <div
        ref={viewportRef}
        role="list"
        aria-label="Gallery"
        {...rest}
        className={cn(
          "flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain",
          "[scrollbar-width:thin]",
          className
        )}
        style={{ ...styleVars, gap, ...style }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            ref={(el) => {
              itemEls.current[i] = el;
            }}
            role="listitem"
            tabIndex={0}
            className={cn(itemClass, "snap-center")}
          >
            {item}
          </div>
        ))}
      </div>
    );
  }

  // ----------------------------- Interactive -----------------------------
  return (
    <div
      ref={viewportRef}
      role="list"
      aria-label="Gallery"
      {...rest}
      data-dragging={dragging ? "" : undefined}
      className={cn(
        "relative w-full select-none touch-pan-y overflow-hidden",
        "cursor-grab data-[dragging]:cursor-grabbing",
        "focus-visible:outline-none",
        className
      )}
      style={{ ...styleVars, ...style }}
    >
      <div
        ref={trackRef}
        aria-hidden={false}
        className="flex w-max items-center will-change-transform"
        style={{ gap }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            ref={(el) => {
              itemEls.current[i] = el;
            }}
            role="listitem"
            tabIndex={0}
            className={cn(itemClass, "will-change-transform")}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default DragScrollGallery;
