"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/utils";

export interface EyeTrackingProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color"> {
  /** How many eyes to render. */
  count?: number;
  /** Eye height in px (width is derived from it). */
  size?: number;
  /** Sclera / eyeball fill. */
  eyeColor?: string;
  /** Pupil fill. */
  pupilColor?: string;
  /** Iris ring around the pupil. Defaults to the Parable violet. */
  irisColor?: string;
  /**
   * Accessible label. When set, the whole graphic is exposed as
   * `role="img"` with this label; otherwise it stays `aria-hidden` (decorative).
   */
  label?: string;
}

/** Spring feel for pupil tracking — snappy but with a little follow-through. */
const TRACK_SPRING = { stiffness: 220, damping: 20, mass: 0.45 } as const;
/** Quick eased blink close/open. */
const BLINK_EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];
/** Pointer speed (px/ms) above which a scheduled blink is deferred. */
const FAST_POINTER = 1.1;

/**
 * Clamp a pupil offset to the interior of the eye's ellipse. The pupil aims at
 * the pointer along the true direction vector, rides the ellipse boundary
 * (semi-axes `a`,`b`) so it never spills past the sclera, and eases toward
 * center as the pointer approaches so it doesn't jitter on top of the eye.
 */
function eyeOffset(
  el: HTMLElement | null,
  px: number,
  py: number,
  a: number,
  b: number
): { x: number; y: number } {
  if (!el) return { x: 0, y: 0 };
  const r = el.getBoundingClientRect();
  const dx = px - (r.left + r.width / 2);
  const dy = py - (r.top + r.height / 2);
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001 || a <= 0 || b <= 0) return { x: 0, y: 0 };
  const ux = dx / dist;
  const uy = dy / dist;
  // Boundary radius of the ellipse along the unit direction (ux,uy).
  const edge = 1 / Math.hypot(ux / a, uy / b);
  // Saturating proximity: 0 at the eye center, → 1 far away, always ≤ 1.
  const proximity = dist / (dist + a);
  const reach = edge * proximity;
  return { x: ux * reach, y: uy * reach };
}

/**
 * EyeTracking — a set of cartoon oval eyes whose pupils chase the pointer
 * anywhere in the viewport, spring-smoothed and clamped inside each eye, with an
 * occasional natural blink that pauses during fast pointer flicks. The palette
 * mirrors the site's `--pb-*` tokens (violet iris by default). Purely
 * decorative: `aria-hidden` unless you pass a `label`. Under
 * `prefers-reduced-motion` the pupils rest centered and the blink is disabled.
 *
 * @parable/eye-tracking
 */
export function EyeTracking({
  count = 2,
  size = 96,
  eyeColor = "#fafafa",
  pupilColor = "#0f0f10",
  irisColor = "#8b5cf6",
  label,
  className,
  style,
  ...props
}: EyeTrackingProps) {
  const reduceMotion = useReducedMotion();
  const reduce = !!reduceMotion;

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const [blink, setBlink] = React.useState(false);

  // Pointer bookkeeping for the fast-flick blink pause.
  const lastMoveAt = React.useRef(0);
  const lastPos = React.useRef({ x: 0, y: 0 });
  const speed = React.useRef(0);

  // Look forward (viewport center) until the pointer is seen.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    pointerX.set(window.innerWidth / 2);
    pointerY.set(window.innerHeight / 2);
  }, [pointerX, pointerY]);

  // Track the pointer across the whole window and measure its speed.
  React.useEffect(() => {
    if (reduce || typeof window === "undefined") return;
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      const dt = now - lastMoveAt.current;
      if (lastMoveAt.current !== 0 && dt > 0) {
        const d = Math.hypot(e.clientX - lastPos.current.x, e.clientY - lastPos.current.y);
        speed.current = d / dt;
      }
      lastMoveAt.current = now;
      lastPos.current = { x: e.clientX, y: e.clientY };
      pointerX.set(e.clientX);
      pointerY.set(e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, pointerX, pointerY]);

  // Randomized blink loop (2–6s), deferred while the pointer is moving fast.
  React.useEffect(() => {
    if (reduce) return;
    let openTimer: ReturnType<typeof setTimeout> | undefined;
    let nextTimer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      nextTimer = setTimeout(run, 2000 + Math.random() * 4000);
    };
    const run = () => {
      const recentlyMoving = performance.now() - lastMoveAt.current < 160;
      if (recentlyMoving && speed.current > FAST_POINTER) {
        nextTimer = setTimeout(run, 450);
        return;
      }
      setBlink(true);
      openTimer = setTimeout(() => setBlink(false), 120);
      schedule();
    };
    schedule();
    return () => {
      if (openTimer) clearTimeout(openTimer);
      if (nextTimer) clearTimeout(nextTimer);
    };
  }, [reduce]);

  const eyes = React.useMemo(
    () => Array.from({ length: Math.max(1, Math.floor(count)) }),
    [count]
  );

  const a11y = label
    ? ({ role: "img", "aria-label": label } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <div
      className={cn("inline-flex items-center justify-center", className)}
      style={{ gap: size * 0.28, ...style }}
      {...a11y}
      {...props}
    >
      {eyes.map((_, i) => (
        <Eye
          key={i}
          size={size}
          eyeColor={eyeColor}
          pupilColor={pupilColor}
          irisColor={irisColor}
          blink={blink}
          reduce={reduce}
          pointerX={pointerX}
          pointerY={pointerY}
        />
      ))}
    </div>
  );
}

function Eye({
  size,
  eyeColor,
  pupilColor,
  irisColor,
  blink,
  reduce,
  pointerX,
  pointerY,
}: {
  size: number;
  eyeColor: string;
  pupilColor: string;
  irisColor: string;
  blink: boolean;
  reduce: boolean;
  pointerX: ReturnType<typeof useMotionValue<number>>;
  pointerY: ReturnType<typeof useMotionValue<number>>;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  const geo = React.useMemo(() => {
    const eyeHeight = size;
    const eyeWidth = size * 0.74;
    const irisD = size * 0.46;
    const pupilD = size * 0.3;
    const glintD = size * 0.11;
    const pad = size * 0.05;
    return {
      eyeHeight,
      eyeWidth,
      irisD,
      pupilD,
      glintD,
      // Ellipse the iris center is allowed to roam within.
      a: eyeWidth / 2 - irisD / 2 - pad,
      b: eyeHeight / 2 - irisD / 2 - pad,
    };
  }, [size]);

  const offset = useTransform(() =>
    eyeOffset(ref.current, pointerX.get(), pointerY.get(), geo.a, geo.b)
  );
  const targetX = useTransform(offset, (o) => o.x);
  const targetY = useTransform(offset, (o) => o.y);
  const springX = useSpring(targetX, TRACK_SPRING);
  const springY = useSpring(targetY, TRACK_SPRING);

  const x = reduce ? 0 : springX;
  const y = reduce ? 0 : springY;

  return (
    <motion.div
      ref={ref}
      aria-hidden
      className="relative shrink-0 overflow-hidden"
      animate={reduce ? undefined : { scaleY: blink ? 0.12 : 1 }}
      transition={{ duration: 0.12, ease: BLINK_EASE }}
      style={{
        width: geo.eyeWidth,
        height: geo.eyeHeight,
        borderRadius: "50%",
        background: eyeColor,
        transformOrigin: "50% 50%",
        boxShadow: `0 ${size * 0.03}px ${size * 0.12}px rgba(0,0,0,0.18), inset 0 ${
          -size * 0.05
        }px ${size * 0.14}px rgba(0,0,0,0.10), inset 0 ${size * 0.04}px ${
          size * 0.1
        }px rgba(255,255,255,0.55)`,
      }}
    >
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          x,
          y,
          width: geo.irisD,
          height: geo.irisD,
          marginLeft: -geo.irisD / 2,
          marginTop: -geo.irisD / 2,
          background: irisColor,
          boxShadow: "inset 0 0 6px rgba(0,0,0,0.35)",
        }}
      >
        <div
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: geo.pupilD,
            height: geo.pupilD,
            marginLeft: -geo.pupilD / 2,
            marginTop: -geo.pupilD / 2,
            background: pupilColor,
          }}
        />
        <div
          aria-hidden
          className="absolute rounded-full"
          style={{
            width: geo.glintD,
            height: geo.glintD,
            top: geo.irisD * 0.16,
            left: geo.irisD * 0.2,
            background: "rgba(255,255,255,0.92)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}

export default EyeTracking;
