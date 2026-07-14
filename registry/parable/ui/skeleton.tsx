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

/** Round a float to 3 decimals — full-precision floats trip React hydration. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Clamp `n` into the inclusive `[lo, hi]` range. */
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/**
 * Deterministic 0..1 hash of a scalar seed. Pure and stable, so line widths are
 * identical on the server and the first client render — no `Math.random()`
 * during render, no hydration mismatch.
 */
function hash01(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/** Normalise a size prop: numbers become `px`, strings pass through. */
const dim = (v: number | string | undefined): string | undefined =>
  v == null ? undefined : typeof v === "number" ? `${v}px` : v;

/** Style objects here carry CSS custom properties (`--pb-sk-delay`). */
type CSSVars = React.CSSProperties & Record<`--${string}`, string>;

/**
 * Deterministic width for text line `i` of `total`. The last line is short (a
 * paragraph's ragged edge); interior lines vary just enough to read as real
 * copy rather than a stack of identical bars.
 */
function lineWidth(i: number, total: number): string {
  if (total <= 1) return "100%";
  if (i === total - 1) return `${r3(52 + hash01(i * 1.3 + 0.7) * 20)}%`;
  return `${r3(82 + hash01(i * 1.7 + 2.3) * 18)}%`;
}

/**
 * The single injected stylesheet. The shimmer is pure CSS: a `::after` sheen
 * that sweeps left→right on an eased, infinite loop, staggered per block via the
 * inherited `--pb-sk-delay` custom property. Colour is derived from
 * `currentColor` so the placeholder adapts to whatever surface it sits on —
 * light-tinted on dark, dark-tinted on light. Under `prefers-reduced-motion`
 * the sheen is removed entirely, leaving a static, legible muted block.
 */
const SKELETON_CSS =
  ".pb-skeleton{position:relative;display:block;overflow:hidden;" +
  "background-color:color-mix(in srgb,currentColor 13%,transparent)}" +
  ".pb-skeleton::after{content:'';position:absolute;inset:0;" +
  "transform:translateX(-100%);background:linear-gradient(90deg," +
  "transparent 0%,color-mix(in srgb,currentColor 22%,transparent) 50%," +
  "transparent 100%);" +
  "animation:pb-skeleton-sweep 1.6s cubic-bezier(.22,1,.36,1) infinite;" +
  "animation-delay:var(--pb-sk-delay,0s)}" +
  "@keyframes pb-skeleton-sweep{0%{transform:translateX(-100%)}" +
  "100%{transform:translateX(100%)}}" +
  "@media (prefers-reduced-motion:reduce){" +
  ".pb-skeleton::after{animation:none;display:none}}";

/**
 * The visual placeholder block. Always decorative (`aria-hidden`) — the
 * accessible "loading" semantics live on the composed container when a `label`
 * is supplied.
 */
function Bar({ className, style }: { className?: string; style?: CSSVars }) {
  return (
    <div aria-hidden className={cn("pb-skeleton", className)} style={style} />
  );
}

export type SkeletonVariant = "text" | "rect" | "circle" | "card";

export interface SkeletonProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Which placeholder shape to render. Defaults to `"rect"`. */
  variant?: SkeletonVariant;
  /** Block width. Number → px, string passes through (e.g. `"60%"`). */
  width?: number | string;
  /** Block height. Number → px, string passes through. */
  height?: number | string;
  /** Corner radius. Number → px, string passes through. */
  radius?: number | string;
  /** For `variant="text"`: how many lines to render (clamped 1–16). */
  lines?: number;
  /**
   * When set, the placeholder becomes an accessible busy region
   * (`role="status" aria-busy`) announcing this label to assistive tech.
   * Omitted, the whole placeholder is `aria-hidden` — purely decorative.
   */
  label?: string;
}

/**
 * Skeleton — a content placeholder that renders muted blocks with a soft
 * shimmer sweep while real content loads. `variant` selects the shape:
 * `"rect"` (default), `"text"` (n ragged lines of varied, deterministic
 * widths), `"circle"` (avatar), or `"card"` (a composed media + avatar + copy
 * preset). The shimmer is 100% CSS (no animation deps) — an eased `::after`
 * sheen sweeps across each block, staggered per block so groups cascade.
 *
 * Convenience presets are attached: `Skeleton.Text`, `Skeleton.Avatar`,
 * `Skeleton.Card`. Placeholders are `aria-hidden` by default; pass `label` to
 * turn one into an `aria-busy` status region for screen readers. Under
 * `prefers-reduced-motion` the sweep is dropped, leaving a static muted block.
 *
 * Colour is derived from `currentColor`, so the placeholder adapts to its
 * surface (light-tinted on dark, dark-tinted on light) and needs no palette
 * prop. Radii mirror the site's rounded surfaces; the ink backdrop pairs with
 * `--pb-ink` `#0f0f10`.
 *
 * @parable/skeleton
 */
function SkeletonBase({
  variant = "rect",
  width,
  height,
  radius,
  lines = 3,
  label,
  className,
  style,
  ...props
}: SkeletonProps) {
  useInjectedKeyframes("pb-skeleton-kf", SKELETON_CSS);

  // Accessibility posture for the top-level element of every variant.
  const busyAttrs = label
    ? ({ role: "status", "aria-busy": true, "aria-live": "polite" } as const)
    : ({ "aria-hidden": true } as const);

  const srLabel = label ? <span className="sr-only">{label}</span> : null;

  if (variant === "text") {
    const count = clamp(Math.round(lines), 1, 16);
    return (
      <div
        className={cn("flex w-full flex-col gap-2.5", className)}
        style={style}
        {...busyAttrs}
        {...props}
      >
        {srLabel}
        {Array.from({ length: count }, (_, i) => (
          <Bar
            key={i}
            className="rounded-full"
            style={{
              width: lineWidth(i, count),
              height: dim(height) ?? "0.72rem",
              borderRadius: dim(radius) ?? "9999px",
              "--pb-sk-delay": `${r3(i * 0.09)}s`,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "circle") {
    const size = dim(width) ?? dim(height) ?? "2.5rem";
    return (
      <div
        className={cn("pb-skeleton", className)}
        style={{
          width: size,
          height: size,
          borderRadius: dim(radius) ?? "9999px",
          flexShrink: 0,
          ...style,
        }}
        {...busyAttrs}
        {...props}
      >
        {srLabel}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "flex w-full max-w-full flex-col gap-4 rounded-2xl border p-4",
          "border-black/10 dark:border-white/10",
          className
        )}
        style={{ width: dim(width), borderRadius: dim(radius), ...style }}
        {...busyAttrs}
        {...props}
      >
        {srLabel}
        <Bar
          className="w-full rounded-xl"
          style={{ height: dim(height) ?? "9rem", "--pb-sk-delay": "0s" }}
        />
        <div className="flex items-center gap-3">
          <Bar
            className="rounded-full"
            style={{
              width: "2.75rem",
              height: "2.75rem",
              "--pb-sk-delay": "0.05s",
            }}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Bar
              className="h-3 rounded-full"
              style={{ width: "56%", "--pb-sk-delay": "0.1s" }}
            />
            <Bar
              className="h-3 rounded-full"
              style={{ width: "38%", "--pb-sk-delay": "0.15s" }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <Bar
              key={i}
              className="h-2.5 rounded-full"
              style={{
                width: lineWidth(i, 3),
                "--pb-sk-delay": `${r3(0.2 + i * 0.06)}s`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // variant === "rect" (default)
  return (
    <div
      className={cn("pb-skeleton", className)}
      style={{
        width: dim(width) ?? "100%",
        height: dim(height) ?? "1rem",
        borderRadius: dim(radius) ?? "0.5rem",
        ...style,
      }}
      {...busyAttrs}
      {...props}
    >
      {srLabel}
    </div>
  );
}

SkeletonBase.displayName = "Skeleton";

/** Multi-line text-block placeholder. */
function SkeletonText(props: Omit<SkeletonProps, "variant">) {
  return <SkeletonBase variant="text" {...props} />;
}
SkeletonText.displayName = "Skeleton.Text";

/** Circular avatar placeholder. */
function SkeletonAvatar(props: Omit<SkeletonProps, "variant">) {
  return <SkeletonBase variant="circle" {...props} />;
}
SkeletonAvatar.displayName = "Skeleton.Avatar";

/** Composed media + avatar + copy card placeholder. */
function SkeletonCard(props: Omit<SkeletonProps, "variant">) {
  return <SkeletonBase variant="card" {...props} />;
}
SkeletonCard.displayName = "Skeleton.Card";

export const Skeleton = Object.assign(SkeletonBase, {
  Text: SkeletonText,
  Avatar: SkeletonAvatar,
  Card: SkeletonCard,
});

export default Skeleton;
