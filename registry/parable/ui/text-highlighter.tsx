"use client";

import * as React from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/utils";

/** Match a 3- or 6-digit hex colour so we know when we can synthesise alpha. */
function isHex(value: string): boolean {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

/** Convert "#rgb" / "#rrggbb" into an `rgba(...)` string at the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = Number.parseInt(h, 16);
  if (Number.isNaN(n)) return hex;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Round to 3 decimals so animated inline styles never emit long floats. */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

const EASE = [0.22, 1, 0.36, 1] as const;
/** Fraction of the line box the marker band covers, anchored to the baseline. */
const MARKER_HEIGHT = "62%";
const UNDERLINE_THICKNESS = "0.12em";

type Variant = "marker" | "underline" | "box";

/**
 * Build the static (non-animated) background styles for a variant. The sweep
 * itself is driven separately via `background-size`, so everything here is the
 * paint that lives *behind* the text — the glyphs are never touched, which is
 * why they stay fully legible at every point in the reveal.
 */
function variantStyle(variant: Variant, color: string): React.CSSProperties {
  const hex = isHex(color);
  const clone: React.CSSProperties = {
    backgroundRepeat: variant === "box" ? "no-repeat, no-repeat" : "no-repeat",
    WebkitBoxDecorationBreak: "clone",
    boxDecorationBreak: "clone",
  };

  if (variant === "underline") {
    const line = hex ? hexToRgba(color, 0.95) : color;
    return {
      ...clone,
      backgroundImage: `linear-gradient(${line}, ${line})`,
      backgroundPosition: "0% 100%",
      borderRadius: "0.06em",
    };
  }

  if (variant === "box") {
    const fill = hex ? hexToRgba(color, 0.14) : color;
    const border = hex ? hexToRgba(color, 0.85) : color;
    // Two layers: a padding-box fill plus a border-box gradient that shows
    // through the transparent border — both revealed by the same sweep.
    return {
      ...clone,
      backgroundImage: `linear-gradient(${fill}, ${fill}), linear-gradient(${border}, ${border})`,
      backgroundOrigin: "padding-box, border-box",
      backgroundClip: "padding-box, border-box",
      backgroundPosition: "0% 0%, 0% 0%",
      border: "1.5px solid transparent",
      borderRadius: "0.34em",
      padding: "0.06em 0.28em",
      margin: "0 -0.14em",
    } as React.CSSProperties;
  }

  // marker — a slightly denser base fades up into a lighter top, mimicking the
  // pooled ink of a real highlighter stroke.
  const top = hex ? hexToRgba(color, 0.22) : color;
  const bottom = hex ? hexToRgba(color, 0.5) : color;
  return {
    ...clone,
    backgroundImage: `linear-gradient(to top, ${bottom}, ${top})`,
    backgroundPosition: "0% 100%",
    borderRadius: "0.14em",
    padding: "0 0.14em",
    margin: "0 -0.14em",
  };
}

export interface TextHighlighterProps
  extends Omit<
    React.HTMLAttributes<HTMLSpanElement>,
    "color" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"
  > {
  /** The text (or inline nodes) to highlight. */
  children: React.ReactNode;
  /** Highlight style: a marker band, a drawn underline, or a framed box. */
  variant?: Variant;
  /** Highlight colour. Hex values get sensible low-alpha treatment per variant. */
  color?: string;
  /** Sweep duration in seconds. */
  duration?: number;
  /** Delay before the sweep starts, in seconds. */
  delay?: number;
  /** Fraction of the element that must be visible before the sweep fires. */
  amount?: number;
  /** Animate only the first time it enters the viewport. */
  once?: boolean;
}

/**
 * TextHighlighter — an inline marker sweep for prose. When the phrase scrolls
 * into view a coloured highlight reveals left→right behind the text: a
 * highlighter `marker` band, a drawn `underline`, or a framed `box`. The paint
 * is pure CSS `background` on the text element itself (with
 * `box-decoration-break: clone`), so it wraps naturally across lines, the glyphs
 * are never overlaid or clipped — they stay in the accessibility tree and fully
 * legible throughout — and there are no decorative DOM layers to hide.
 *
 * The sweep is a single `background-size` width animated on a spring-free
 * cubic-bezier(.22,1,.36,1) motion value, so nothing high-precision or random is
 * emitted during render. Under `prefers-reduced-motion` the highlight is shown
 * complete, with no sweep. Default colour is violet (#8b5cf6) at a low alpha,
 * mirroring the site's `--pb-*` tokens.
 *
 * @parable/text-highlighter
 */
export function TextHighlighter({
  children,
  variant = "marker",
  color = "#8b5cf6",
  duration = 0.9,
  delay = 0,
  amount = 0.6,
  once = true,
  className,
  style,
  ...rest
}: TextHighlighterProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once, amount });
  const reduce = useReducedMotion();

  const reveal = useMotionValue(0);
  const backgroundSize = useTransform(reveal, (r) => {
    const w = round3(Math.min(1, Math.max(0, r)) * 100);
    if (variant === "box") return `${w}% 100%, ${w}% 100%`;
    if (variant === "underline") return `${w}% ${UNDERLINE_THICKNESS}`;
    return `${w}% ${MARKER_HEIGHT}`;
  });

  React.useEffect(() => {
    if (reduce) {
      reveal.set(1);
      return;
    }
    if (inView) {
      const controls = animate(reveal, 1, { duration, ease: EASE, delay });
      return () => controls.stop();
    }
    if (!once) {
      const controls = animate(reveal, 0, {
        duration: duration * 0.6,
        ease: EASE,
      });
      return () => controls.stop();
    }
  }, [inView, reduce, once, duration, delay, reveal]);

  const vStyle = React.useMemo(
    () => variantStyle(variant, color),
    [variant, color]
  );

  return (
    <motion.span
      ref={ref}
      className={cn(className)}
      style={{ ...vStyle, ...style, backgroundSize }}
      {...rest}
    >
      {children}
    </motion.span>
  );
}

export default TextHighlighter;
