"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function useInjectedKeyframes(id: string, css: string) {
  React.useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

function usePrefersReducedMotion() {
  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduce(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduce;
}

/** Heading element the gradient is clipped onto. */
export type GradientHeadingTag =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "p";

/** Named gradient palettes. */
export type GradientHeadingVariant = "aurora" | "steel" | "signal";

/** Display size preset (text size + weight + tracking). */
export type GradientHeadingSize = "sm" | "md" | "lg" | "xl";

export interface GradientHeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  /**
   * Element to render. Defaults to `"h2"`. Use `h1`–`h6` for document
   * structure, or `p` when the visual style is wanted without heading
   * semantics.
   */
  as?: GradientHeadingTag;
  /**
   * Gradient palette. Mirrors the site's `--pb-*` tokens.
   * - `aurora` — violet → fuchsia → ember (default)
   * - `steel` — warm vellum → chrome-ish grays
   * - `signal` — violet → signal cyan
   */
  variant?: GradientHeadingVariant;
  /** Slowly drift the gradient (~8s loop). Ignored under reduced motion. */
  animate?: boolean;
  /** Size preset. Defaults to `"md"`. */
  size?: GradientHeadingSize;
}

/**
 * Bright, saturated gradients that keep large-text contrast (>= 3:1) on both
 * dark and light backdrops. Each stop set mixes a darker anchor (reads on
 * white) with lighter tones (read on black); the diagonal blend gives every
 * glyph some of each. Brand hex values mirror the site's `--pb-*` tokens.
 */
const VARIANT_GRADIENTS: Record<GradientHeadingVariant, string> = {
  aurora:
    "linear-gradient(100deg,#8b5cf6 0%,#ec4899 34%,#f5a623 52%,#ec4899 72%,#8b5cf6 100%)",
  steel:
    "linear-gradient(100deg,#f5f5f4 0%,#a8a29e 24%,#57534e 50%,#d6d3d1 74%,#78716c 100%)",
  signal:
    "linear-gradient(100deg,#8b5cf6 0%,#22d3ee 50%,#8b5cf6 100%)",
};

const SIZE_CLASSES: Record<GradientHeadingSize, string> = {
  sm: "text-2xl font-semibold tracking-tight sm:text-3xl",
  md: "text-4xl font-bold tracking-tight sm:text-5xl",
  lg: "text-5xl font-bold tracking-tighter sm:text-6xl",
  xl: "text-6xl font-extrabold tracking-tighter sm:text-7xl",
};

/**
 * GradientHeading — a polymorphic heading (`h1`–`h6`/`p`, default `h2`) whose
 * text is painted with a background-clipped gradient. Three brand variants
 * (`aurora`, `steel`, `signal`) and four size presets. When `animate` is on and
 * motion is allowed, the gradient drifts on an ~8s ease-in-out loop; under
 * `prefers-reduced-motion` (or `animate={false}`) it renders a legible static
 * gradient. A hair-thin drop shadow defines glyph edges so lighter stops stay
 * readable on light backgrounds. Ships its own keyframes; no dependencies
 * beyond React and `cn`.
 *
 * @parable/gradient-heading
 */
export const GradientHeading = React.forwardRef<
  HTMLHeadingElement,
  GradientHeadingProps
>(function GradientHeading(
  {
    as = "h2",
    variant = "aurora",
    animate = true,
    size = "md",
    className,
    children,
    style,
    ...props
  },
  ref
) {
  const Comp = as as React.ElementType;
  const reduce = usePrefersReducedMotion();
  const shouldAnimate = animate && !reduce;

  useInjectedKeyframes(
    "pb-gradient-heading-kf",
    "@keyframes pb-gh-drift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}@media (prefers-reduced-motion:reduce){.pb-gradient-heading{animation:none!important;background-position:0% 50%!important}}"
  );

  const gradientStyle: React.CSSProperties = {
    backgroundImage: VARIANT_GRADIENTS[variant],
    backgroundSize: "200% auto",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
    // Renders from glyph geometry even with transparent fill — a faint edge
    // that lifts lighter stops off light backgrounds without dulling dark ones.
    textShadow: "0 1px 1px rgb(0 0 0 / 0.12)",
    ...(shouldAnimate
      ? { animation: "pb-gh-drift 8s ease-in-out infinite" }
      : { backgroundPosition: "0% 50%" }),
    ...style,
  };

  return (
    <Comp
      ref={ref}
      className={cn(
        "pb-gradient-heading inline-block bg-clip-text leading-tight text-transparent",
        "[text-wrap:balance]",
        SIZE_CLASSES[size],
        className
      )}
      style={gradientStyle}
      {...props}
    >
      {children}
    </Comp>
  );
});

export default GradientHeading;
