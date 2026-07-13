"use client";

import * as React from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionStyle,
  type MotionValue,
  type SpringOptions,
} from "motion/react";
import { cn } from "@/lib/utils";

/** Inject a stylesheet of keyframes once per document, keyed by a stable id. */
function useInjectedKeyframes(id: string, css: string): void {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
    // Left in place on unmount: other instances on the page share this sheet.
  }, [id, css]);
}

const KF_ID = "pb-parallax-hero-kf";
const KEYFRAMES = `
@keyframes pb-parallax-hero-float-a {
  0%, 100% { transform: translate3d(0px, 0px, 0); }
  50% { transform: translate3d(10px, -16px, 0); }
}
@keyframes pb-parallax-hero-float-b {
  0%, 100% { transform: translate3d(0px, 0px, 0); }
  33% { transform: translate3d(-14px, 9px, 0); }
  66% { transform: translate3d(8px, -7px, 0); }
}
`;

/** Round to 3dp so full-precision floats never reach an inline style (React 19 hydration). */
const round = (n: number): number => Math.round(n * 1000) / 1000;

const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

/** Max stage tilt in degrees at the pointer extremes. */
const TILT = 6;
/** translateZ per unit of depth (px) — separates the diorama planes under tilt. */
const DEPTH_Z = 24;
/** Depth of the built-in gradient backdrop (moves least). */
const BASE_DEPTH = 0.16;
/** Depth of the foreground copy slot. */
const FOREGROUND_DEPTH = 1;

const SPRING: SpringOptions = { stiffness: 180, damping: 26, mass: 0.5 };

const DEFAULT_BACKDROP =
  "radial-gradient(110% 90% at 50% -12%, rgba(139,92,246,0.22), transparent 60%)," +
  "radial-gradient(90% 80% at 86% 112%, rgba(236,72,153,0.16), transparent 55%)," +
  "radial-gradient(80% 70% at 8% 100%, rgba(34,211,238,0.12), transparent 55%)";

/** Built-in floating accent shapes: brand-hued, blurred, drifting on their own planes. */
const BLOBS: ReadonlyArray<{
  depth: number;
  color: string;
  size: number;
  pos: React.CSSProperties;
  anim: "a" | "b";
  duration: number;
  delay: number;
}> = [
  { depth: 0.45, color: "#8b5cf6", size: 360, pos: { top: "-8%", left: "-6%" }, anim: "a", duration: 8, delay: 0 },
  { depth: 0.8, color: "#ec4899", size: 300, pos: { bottom: "-12%", right: "-4%" }, anim: "b", duration: 10, delay: 1.1 },
  { depth: 1.15, color: "#22d3ee", size: 220, pos: { top: "34%", right: "26%" }, anim: "a", duration: 9, delay: 0.5 },
  { depth: 0.6, color: "#f5a623", size: 180, pos: { bottom: "6%", left: "18%" }, anim: "b", duration: 11, delay: 0.3 },
];

interface ParallaxLayerProps {
  mvX: MotionValue<number>;
  mvY: MotionValue<number>;
  /** Parallax multiplier. 0 = static; 1 ≈ `intensity` px of travel; >1 moves more. */
  depth: number;
  intensity: number;
  /** translateZ scale; 0 keeps the plane flat (used for crisp foreground copy). */
  depthZ: number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  "aria-hidden"?: boolean;
}

/**
 * One depth plane. Its own `useTransform` maps the shared, spring-smoothed
 * pointer values into a translate scaled by `depth`, plus a static translateZ
 * so the plane separates from its neighbours when the stage tilts.
 */
function ParallaxLayer({
  mvX,
  mvY,
  depth,
  intensity,
  depthZ,
  className,
  style,
  children,
  ...rest
}: ParallaxLayerProps) {
  const x = useTransform(mvX, (v) => round(v * intensity * depth));
  const y = useTransform(mvY, (v) => round(v * intensity * depth));
  const layerStyle: MotionStyle = { x, y, z: round(depth * depthZ), ...style };
  return (
    <motion.div className={className} style={layerStyle} {...rest}>
      {children}
    </motion.div>
  );
}

export interface ParallaxLayerSpec {
  /** Anything to render on this plane. */
  content: React.ReactNode;
  /** Parallax multiplier. 0 = static; 1 ≈ `intensity` px of travel; >1 moves more. */
  depth: number;
}

export interface ParallaxHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Extra mid-ground planes rendered behind the copy. Each `content` translates
   * by `depth × intensity`. Omit to use just the built-in backdrop + accents.
   */
  layers?: ParallaxLayerSpec[];
  /** Backdrop node (e.g. an image). Falls back to a soft brand gradient. */
  background?: React.ReactNode;
  /** Max shift in px for a depth-1 plane at the pointer extremes. */
  intensity?: number;
}

/**
 * ParallaxHero — a layered parallax hero that reads like a 3D diorama. A soft
 * brand-gradient backdrop, a set of blurred floating accent shapes, optional
 * mid-ground `layers`, and the foreground copy slot each sit on their own depth
 * plane. As the pointer moves, one shared value (spring-smoothed) drives every
 * plane: each translates by `depth × intensity` and the decorative stage tilts a
 * few degrees in 3D, so nearer planes travel farther than distant ones and the
 * scene gains real depth. The copy slot gets a gentle translate but no tilt, so
 * headlines stay crisp and readable.
 *
 * SSR-safe: nothing random or time-based runs during render, so the first client
 * paint matches the server (planes start centred, animating only from a spring).
 * Decorative planes are `aria-hidden`; interactive content belongs in `children`.
 * Under `prefers-reduced-motion` the pointer parallax and the shape drift are
 * both disabled — a static, fully legible composition remains. Colour defaults
 * mirror the site's `--pb-*` tokens (violet #8b5cf6, fuchsia #ec4899, ember
 * #f5a623, signal #22d3ee on ink #0f0f10).
 *
 * @parable/parallax-hero
 */
export function ParallaxHero({
  layers,
  background,
  intensity = 12,
  className,
  children,
  style,
  ...props
}: ParallaxHeroProps) {
  const reduce = useReducedMotion();
  useInjectedKeyframes(KF_ID, KEYFRAMES);

  // Normalised pointer position in [-1, 1] per axis; a single spring smooths it.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, SPRING);
  const sy = useSpring(py, SPRING);

  const rotateX = useTransform(sy, (v) => round(v * -TILT));
  const rotateY = useTransform(sx, (v) => round(v * TILT));

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "touch") return;
      const r = e.currentTarget.getBoundingClientRect();
      if (!r.width || !r.height) return;
      px.set(clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1));
      py.set(clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1));
    },
    [px, py]
  );

  const handlePointerLeave = React.useCallback(() => {
    px.set(0);
    py.set(0);
  }, [px, py]);

  const zScale = reduce ? 0 : DEPTH_Z;

  return (
    <div
      className={cn(
        "relative grid min-h-[420px] w-full place-items-center overflow-hidden",
        className
      )}
      style={{ background: "#0f0f10", perspective: 1200, ...style }}
      {...props}
      onPointerMove={reduce ? undefined : handlePointerMove}
      onPointerLeave={reduce ? undefined : handlePointerLeave}
    >
      {/* Decorative diorama: backdrop, accent shapes, and any provided layers.
          Tilts as a whole; pointer-events pass through to the copy slot. */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        {/* Backdrop — slightly over-scanned so a few px of drift never bares an edge. */}
        <ParallaxLayer
          mvX={sx}
          mvY={sy}
          depth={BASE_DEPTH}
          intensity={intensity}
          depthZ={zScale}
          aria-hidden
          className="absolute inset-0"
        >
          <div
            className="absolute -inset-[8%] [&>img]:h-full [&>img]:w-full [&>img]:object-cover"
            style={
              background
                ? undefined
                : { backgroundImage: DEFAULT_BACKDROP, backgroundColor: "#0f0f10" }
            }
          >
            {background}
          </div>
        </ParallaxLayer>

        {/* Floating accent shapes. */}
        {BLOBS.map((b, i) => (
          <ParallaxLayer
            key={`pb-ph-blob-${i}`}
            mvX={sx}
            mvY={sy}
            depth={b.depth}
            intensity={intensity}
            depthZ={zScale}
            aria-hidden
            className="absolute inset-0"
          >
            <span
              className="absolute rounded-full"
              style={{
                ...b.pos,
                width: b.size,
                height: b.size,
                background: `radial-gradient(circle at 50% 50%, ${b.color}, transparent 68%)`,
                opacity: 0.5,
                filter: "blur(46px)",
                mixBlendMode: "screen",
                willChange: "transform",
                animation: reduce
                  ? undefined
                  : `pb-parallax-hero-float-${b.anim} ${b.duration}s ease-in-out ${b.delay}s infinite`,
              }}
            />
          </ParallaxLayer>
        ))}

        {/* Caller-supplied mid-ground planes. */}
        {layers?.map((layer, i) => (
          <ParallaxLayer
            key={`pb-ph-layer-${i}`}
            mvX={sx}
            mvY={sy}
            depth={layer.depth}
            intensity={intensity}
            depthZ={zScale}
            className="absolute inset-0"
          >
            {layer.content}
          </ParallaxLayer>
        ))}
      </motion.div>

      {/* Vignette — static frame, sits above the diorama and below the copy. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          backgroundImage:
            "radial-gradient(120% 95% at 50% 42%, transparent 46%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Foreground copy slot — translate-only parallax keeps text crisp. */}
      {children != null && (
        <ParallaxLayer
          mvX={sx}
          mvY={sy}
          depth={FOREGROUND_DEPTH}
          intensity={intensity}
          depthZ={0}
          className="relative z-10 p-8"
        >
          {children}
        </ParallaxLayer>
      )}
    </div>
  );
}

export default ParallaxHero;
