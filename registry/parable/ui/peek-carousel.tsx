"use client";

import * as React from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type PanInfo,
} from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** `useLayoutEffect` on the client, `useEffect` on the server (no SSR warning). */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/** Round to 3 decimals — full-precision floats in inline styles trip React 19
 * hydration checks, and the motion values below feed the transform matrix. */
const r3 = (n: number): number => Math.round(n * 1000) / 1000;

/** Measured layout, in px. `step` is the centre-to-centre stride of slides. */
interface Metrics {
  /** Visible width of the viewport / scrollport. */
  vw: number;
  /** Width of a single slide. */
  slideW: number;
  /** Distance between the centres of two adjacent slides (`slideW + GAP`). */
  step: number;
}

const GAP = 16; // gutter between slides, in px
const MIN_SLIDE = 80; // floor so a tight viewport never collapses a slide
const NEIGHBOR_SCALE = 0.86; // scale of a fully off-centre slide
const NEIGHBOR_OPACITY = 0.5; // opacity of a fully off-centre slide
const VELOCITY_PROJECT = 0.1; // seconds of release velocity projected into the snap
const WHEEL_COOLDOWN = 320; // ms lock so one wheel gesture advances one slide
const SPRING = { type: "spring", stiffness: 220, damping: 26 } as const;

/** translateX that centres slide `i` inside the viewport. */
const targetX = (i: number, m: Metrics): number =>
  r3(m.vw / 2 - (i * m.step + m.slideW / 2));

interface PeekSlideProps {
  x: MotionValue<number>;
  index: number;
  count: number;
  metricsRef: React.MutableRefObject<Metrics>;
  width: number;
  active: boolean;
  children: React.ReactNode;
}

/**
 * One slide on the motion track. It derives its own scale / opacity / z-index
 * from the shared track offset `x`, so React never re-renders while the rail
 * moves — the transforms recompute imperatively on every frame `x` ticks. The
 * per-slide `useTransform` hooks live here (not in a `.map` in the parent) so
 * hook order stays stable when `items` grows or shrinks.
 */
function PeekSlide({
  x,
  index,
  count,
  metricsRef,
  width,
  active,
  children,
}: PeekSlideProps) {
  // Normalised distance of this slide's centre from the viewport centre (0..1).
  const dist = React.useCallback(
    (xv: number): number => {
      const m = metricsRef.current;
      if (!m.step) return 0;
      const center = xv + index * m.step + m.slideW / 2;
      return Math.min(1, Math.abs(center - m.vw / 2) / m.step);
    },
    [metricsRef, index]
  );

  const scale = useTransform(x, (xv) =>
    r3(1 - dist(xv) * (1 - NEIGHBOR_SCALE))
  );
  const opacity = useTransform(x, (xv) =>
    r3(1 - dist(xv) * (1 - NEIGHBOR_OPACITY))
  );
  const zIndex = useTransform(x, (xv) => Math.round(100 - dist(xv) * 100));

  return (
    <motion.div
      role="group"
      aria-roledescription="slide"
      aria-label={`${index + 1} of ${count}`}
      aria-hidden={!active}
      style={{ width, scale, opacity, zIndex }}
      className="relative shrink-0 will-change-transform"
    >
      {children}
    </motion.div>
  );
}

export interface PeekCarouselProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  /** Slides to display. Each is centred in turn with its neighbours peeking. */
  items: React.ReactNode[];
  /** Wrap navigation at the ends — next from the last slide returns to the first. */
  loop?: boolean;
  /** Fires with the new active index whenever it changes. */
  onIndexChange?: (index: number) => void;
  /** How many px of each neighbouring slide peeks past the edge. */
  peek?: number;
  /** Accent for arrows, the active dot, and focus rings. Mirrors `--pb-violet`. */
  accent?: string;
}

/**
 * PeekCarousel — an Apple-style peek carousel: the active slide sits centred at
 * full scale while the previous / next slides peek in at the edges, scaled to
 * ~0.86 and dimmed. Navigate by arrows, dots, drag, or the wheel; a release
 * projects its velocity to pick the landing slide, which then springs to centre
 * while every slide's scale / opacity / depth is derived imperatively from the
 * track offset (no React re-render on the hot path). Fully keyboard operable —
 * arrows move, Home / End jump — with real `role="group"`
 * `aria-roledescription="carousel"` semantics, dots as `aria-current` buttons,
 * and only the active slide exposed to assistive tech. `loop` wraps navigation
 * at the ends. Under `prefers-reduced-motion` it degrades to a plain CSS
 * scroll-snap scroller — no scaling, no drag inertia — while keeping the same
 * arrows, dots, keyboard, and labelling.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (accent = violet #8b5cf6).
 *
 * @parable/peek-carousel
 */
export function PeekCarousel({
  items,
  loop = false,
  onIndexChange,
  peek = 48,
  accent = "#8b5cf6",
  className,
  style,
  ...rest
}: PeekCarouselProps) {
  const reduced = !!useReducedMotion();
  const count = items.length;

  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const metricsRef = React.useRef<Metrics>({ vw: 0, slideW: 0, step: 0 });
  const indexRef = React.useRef(0);
  const scrollTimer = React.useRef<number>(0);

  const x = useMotionValue(0);
  const [index, setIndex] = React.useState(0);
  const [dims, setDims] = React.useState<Metrics>({
    vw: 0,
    slideW: 0,
    step: 0,
  });
  const [dragging, setDragging] = React.useState(false);

  // Move to a raw index; clamps or wraps, then animates (or scrolls) into place
  // and reports the change. Reads `indexRef` so rapid presses compose correctly.
  const goTo = React.useCallback(
    (raw: number) => {
      if (count <= 0) return;
      const next = loop
        ? ((raw % count) + count) % count
        : raw < 0
          ? 0
          : raw > count - 1
            ? count - 1
            : raw;

      const m = metricsRef.current;
      if (reduced) {
        const vp = viewportRef.current;
        if (vp && m.step) vp.scrollTo({ left: next * m.step, behavior: "auto" });
      } else if (m.step) {
        animate(x, targetX(next, m), SPRING);
      }

      const changed = next !== indexRef.current;
      indexRef.current = next;
      setIndex(next);
      if (changed) onIndexChange?.(next);
    },
    [count, loop, reduced, onIndexChange, x]
  );

  // Stable handle so long-lived native listeners always call the latest `goTo`.
  const goToRef = React.useRef(goTo);
  goToRef.current = goTo;

  // Measure the viewport, size the slides, and pin the active slide in place.
  // Runs before paint so the first frame is already centred (no flash), and on
  // every resize. Depends on `reduced` because the two paths measure different
  // elements and reposition differently.
  useIsoLayoutEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const measure = () => {
      const vw = Math.round(vp.clientWidth);
      const slideW = Math.max(MIN_SLIDE, vw - 2 * peek - 2 * GAP);
      const step = slideW + GAP;
      const m: Metrics = { vw, slideW, step };
      metricsRef.current = m;
      setDims(m);
      if (reduced) {
        vp.scrollTo({ left: indexRef.current * step, behavior: "auto" });
      } else {
        x.set(targetX(indexRef.current, m));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(vp);
    return () => ro.disconnect();
    // x / metricsRef / indexRef are stable refs; peek+reduced+count drive remeasure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peek, reduced, count]);

  // Keep the active index valid if the collection shrinks under it.
  React.useEffect(() => {
    if (indexRef.current > count - 1) goToRef.current(count - 1);
  }, [count]);

  // Wheel advances one slide per gesture (interactive path only). Attached
  // natively so it can preventDefault; at a non-loop edge it yields to the page.
  React.useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || reduced || count <= 1) return;
    let locked = false;
    let unlock = 0;
    const onWheel = (e: WheelEvent) => {
      const d =
        Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(d) < 2) return;
      const i = indexRef.current;
      if (!loop && ((d > 0 && i === count - 1) || (d < 0 && i === 0))) return;
      e.preventDefault();
      if (locked) return;
      locked = true;
      goToRef.current(i + (d > 0 ? 1 : -1));
      window.clearTimeout(unlock);
      unlock = window.setTimeout(() => {
        locked = false;
      }, WHEEL_COOLDOWN);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      vp.removeEventListener("wheel", onWheel);
      window.clearTimeout(unlock);
    };
  }, [reduced, loop, count]);

  React.useEffect(
    () => () => window.clearTimeout(scrollTimer.current),
    []
  );

  const handleDragEnd = (
    _e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    setDragging(false);
    const m = metricsRef.current;
    if (!m.step) return;
    const predicted = x.get() + info.velocity.x * VELOCITY_PROJECT;
    const raw = (m.vw / 2 - m.slideW / 2 - predicted) / m.step;
    goToRef.current(Math.round(raw));
  };

  // Native scroll (reduced path) syncs the active index back for the dots.
  const onReducedScroll = () => {
    window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => {
      const vp = viewportRef.current;
      const m = metricsRef.current;
      if (!vp || !m.step) return;
      const i = Math.max(
        0,
        Math.min(count - 1, Math.round(vp.scrollLeft / m.step))
      );
      if (i !== indexRef.current) {
        indexRef.current = i;
        setIndex(i);
        onIndexChange?.(i);
      }
    }, 90);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        goTo(indexRef.current - 1);
        break;
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        goTo(indexRef.current + 1);
        break;
      case "Home":
        e.preventDefault();
        goTo(0);
        break;
      case "End":
        e.preventDefault();
        goTo(count - 1);
        break;
      default:
        break;
    }
  };

  const constraints =
    !reduced && dims.step && count > 1
      ? { left: targetX(count - 1, dims), right: targetX(0, dims) }
      : undefined;

  const spacer = Math.max(0, peek);
  const ariaLabel = (rest["aria-label"] as string | undefined) ?? "Carousel";
  const prevDisabled = !loop && index === 0;
  const nextDisabled = !loop && index === count - 1;

  const styleVars = {
    "--pb-pc-accent": accent,
    ...style,
  } as React.CSSProperties;

  const focusRing =
    "outline-none focus-visible:ring-2 focus-visible:ring-[var(--pb-pc-accent)] " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

  if (count === 0) {
    return (
      <div
        {...rest}
        role="group"
        aria-roledescription="carousel"
        aria-label={ariaLabel}
        className={cn("relative w-full", className)}
        style={styleVars}
      />
    );
  }

  // Shared chrome: overlay arrows and the dot rail, identical across paths.
  const arrows = count > 1 && (
    <>
      <button
        type="button"
        onClick={() => goTo(indexRef.current - 1)}
        disabled={prevDisabled}
        aria-label="Previous slide"
        className={cn(
          "absolute left-3 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full",
          "border border-white/10 bg-black/40 text-white/90 backdrop-blur-md",
          "transition-[background-color,opacity,transform] duration-200",
          "hover:bg-black/60 active:scale-95",
          "disabled:pointer-events-none disabled:opacity-0",
          focusRing
        )}
      >
        <ChevronLeft className="size-5" strokeWidth={2.25} />
      </button>
      <button
        type="button"
        onClick={() => goTo(indexRef.current + 1)}
        disabled={nextDisabled}
        aria-label="Next slide"
        className={cn(
          "absolute right-3 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-full",
          "border border-white/10 bg-black/40 text-white/90 backdrop-blur-md",
          "transition-[background-color,opacity,transform] duration-200",
          "hover:bg-black/60 active:scale-95",
          "disabled:pointer-events-none disabled:opacity-0",
          focusRing
        )}
      >
        <ChevronRight className="size-5" strokeWidth={2.25} />
      </button>
    </>
  );

  const dots = count > 1 && (
    <div
      role="group"
      aria-label="Choose slide to display"
      className="mt-4 flex items-center justify-center gap-2"
    >
      {items.map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => goTo(i)}
          aria-label={`Slide ${i + 1}`}
          aria-current={i === index ? "true" : undefined}
          className={cn(
            "h-2 rounded-full transition-all duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
            focusRing,
            i === index
              ? "w-6 bg-[var(--pb-pc-accent)]"
              : "w-2 bg-white/25 hover:bg-white/45"
          )}
        />
      ))}
    </div>
  );

  // ------------------------------- Reduced -------------------------------
  if (reduced) {
    return (
      <div
        {...rest}
        role="group"
        aria-roledescription="carousel"
        aria-label={ariaLabel}
        className={cn("relative w-full", className)}
        style={styleVars}
      >
        <div className="relative">
          <div
            ref={viewportRef}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onScroll={onReducedScroll}
            aria-live="polite"
            className={cn(
              "flex w-full overflow-x-auto overscroll-x-contain rounded-2xl",
              "snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              focusRing
            )}
            style={{ gap: GAP }}
          >
            <div aria-hidden className="shrink-0" style={{ width: spacer }} />
            {items.map((item, i) => (
              <div
                key={i}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
                aria-hidden={i !== index}
                className="relative shrink-0 snap-center"
                style={{ width: dims.slideW || undefined }}
              >
                {item}
              </div>
            ))}
            <div aria-hidden className="shrink-0" style={{ width: spacer }} />
          </div>
          {arrows}
        </div>
        {dots}
      </div>
    );
  }

  // ----------------------------- Interactive -----------------------------
  return (
    <div
      {...rest}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      className={cn("relative w-full", className)}
      style={styleVars}
    >
      <div className="relative">
        <div
          ref={viewportRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          aria-live="polite"
          className={cn(
            "relative w-full overflow-hidden rounded-2xl touch-pan-y",
            focusRing
          )}
        >
          <motion.div
            ref={trackRef}
            drag={count > 1 ? "x" : false}
            dragConstraints={constraints}
            dragElastic={0.16}
            dragMomentum={false}
            onDragStart={() => setDragging(true)}
            onDragEnd={handleDragEnd}
            data-dragging={dragging ? "" : undefined}
            style={{ x, gap: GAP }}
            className={cn(
              "flex w-max select-none will-change-transform",
              count > 1 && "cursor-grab data-[dragging]:cursor-grabbing"
            )}
          >
            {items.map((item, i) => (
              <PeekSlide
                key={i}
                x={x}
                index={i}
                count={count}
                metricsRef={metricsRef}
                width={dims.slideW}
                active={i === index}
              >
                {item}
              </PeekSlide>
            ))}
          </motion.div>
        </div>
        {arrows}
      </div>
      {dots}
    </div>
  );
}

export default PeekCarousel;
