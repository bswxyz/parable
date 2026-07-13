"use client";

import * as React from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { cn } from "@/lib/utils";

/** Shared "hero-grade" ease — a soft, decisive settle. */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Direction the curtain travels as it uncovers the image. */
type RevealDirection = "up" | "left" | "right";

/**
 * clip-path `inset(top right bottom left)` start states. Each hides the image
 * behind a full-cover inset on one edge; the reveal animates every edge to 0%,
 * so the visible band grows out from the opposite edge:
 *  - "up"    → grows from the bottom edge upward
 *  - "left"  → grows from the right edge leftward
 *  - "right" → grows from the left edge rightward
 */
const HIDDEN_CLIP: Record<RevealDirection, string> = {
  up: "inset(100% 0% 0% 0%)",
  left: "inset(0% 0% 0% 100%)",
  right: "inset(0% 100% 0% 0%)",
};
const FULL_CLIP = "inset(0% 0% 0% 0%)";

export interface ImageRevealProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Image source URL. */
  src: string;
  /** Alt text. Required — pass "" only for decorative imagery. */
  alt: string;
  /** CSS aspect-ratio for the frame, e.g. "16/9" or "4/5". Prevents layout shift. */
  aspect?: string;
  /** Which way the curtain wipe travels as it uncovers the image. */
  direction?: RevealDirection;
  /** Border radius for the frame, as any CSS length (e.g. "1rem", "9999px"). */
  rounded?: string;
  /** Fraction of the frame that must be visible before revealing (0–1). */
  amount?: number;
  /** Reveal only the first time it scrolls into view. */
  once?: boolean;
  /** Reveal duration in seconds. */
  duration?: number;
  /** `loading` hint forwarded to the underlying <img>. */
  loading?: "lazy" | "eager";
}

/**
 * ImageReveal — a scroll-triggered curtain wipe for a single image. When the
 * frame scrolls into view, an animating `clip-path` inset uncovers the picture
 * from one edge while the image eases from a 1.1 overscan down to 1 and a brief
 * diagonal sheen sweeps across the surface. The image sits in a fixed
 * aspect-ratio frame (a real <img>, `object-cover`) so there is zero layout
 * shift before or after the reveal. Fires once by default via `useInView`.
 *
 * Under `prefers-reduced-motion` the image is shown immediately at full size
 * with no wipe, no scale, and no sheen — a static, legible fallback.
 *
 * Colour accents mirror the site's `--pb-*` tokens (the sheen is a neutral
 * white streak; no brand hue is baked in).
 *
 * @parable/image-reveal
 */
export function ImageReveal({
  src,
  alt,
  aspect = "16/9",
  direction = "up",
  rounded = "1rem",
  amount = 0.35,
  once = true,
  duration = 1.05,
  loading = "lazy",
  className,
  style,
  ...props
}: ImageRevealProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, amount });
  const reduce = useReducedMotion();

  const shown = reduce ? true : inView;

  const imageTransition: Transition = reduce
    ? { duration: 0 }
    : { duration, ease: EASE };

  const imageVariants: Variants = {
    hidden: reduce
      ? { clipPath: FULL_CLIP, scale: 1 }
      : { clipPath: HIDDEN_CLIP[direction], scale: 1.1 },
    shown: { clipPath: FULL_CLIP, scale: 1 },
  };

  const sheenVariants: Variants = {
    hidden: { x: "-160%", opacity: 0 },
    shown: {
      x: "160%",
      opacity: [0, 0.55, 0],
      transition: {
        duration: duration * 0.85,
        ease: EASE,
        delay: duration * 0.12,
      },
    },
  };

  return (
    <div
      ref={ref}
      data-shown={shown}
      className={cn("relative isolate overflow-hidden bg-white/[0.03]", className)}
      style={{ aspectRatio: aspect, borderRadius: rounded, ...style }}
      {...props}
    >
      <motion.img
        src={src}
        alt={alt}
        loading={loading}
        decoding="async"
        draggable={false}
        variants={imageVariants}
        initial="hidden"
        animate={shown ? "shown" : "hidden"}
        transition={imageTransition}
        className="absolute inset-0 h-full w-full select-none object-cover"
        style={{ willChange: "clip-path, transform" }}
      />

      {/* Decorative light streak that sweeps once as the image resolves. */}
      {!reduce && (
        <motion.span
          aria-hidden
          variants={sheenVariants}
          initial="hidden"
          animate={shown ? "shown" : "hidden"}
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/2 skew-x-[-16deg]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
            mixBlendMode: "overlay",
            willChange: "transform, opacity",
          }}
        />
      )}
    </div>
  );
}

export default ImageReveal;
