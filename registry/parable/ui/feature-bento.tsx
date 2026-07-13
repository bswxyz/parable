"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** Round a float to 3 decimals — full-precision floats trip React hydration. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Parse "#rgb" / "#rrggbb" into an `rgba()` string; falls back to violet. */
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = Number.parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return `rgba(139, 92, 246, ${alpha})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Append a <style> with `id` exactly once, from an effect (SSR-safe). */
function useInjectedKeyframes(id: string, css: string): void {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }, [id, css]);
}

/** `false` on the server and first client paint; resolves after mount. */
function useReducedMotionSafe(): boolean {
  return useReducedMotion() ?? false;
}

/* The pulse animation is set inline, so the reduced-motion block below wins
   with `!important` (a stylesheet `!important` rule beats a normal inline
   style) and freezes both decorative layers into a static, legible frame. */
const KEYFRAMES_ID = "pb-feature-bento-kf";
const KEYFRAMES_CSS = `
@keyframes pb-feature-bento-pulse {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.75; transform: scale(1.18); }
}
@media (prefers-reduced-motion: reduce) {
  [data-pb-fb-pulse] { animation: none !important; opacity: 0.45 !important; transform: none !important; }
  [data-pb-fb-glow] { display: none !important; }
}
`;

export type FeatureBentoSize = "sm" | "wide" | "tall" | "lg";

export interface FeatureBentoItem {
  /** Small leading glyph, tinted with the accent. A lucide icon fits the slot. */
  icon?: React.ReactNode;
  /** Cell heading. */
  title: React.ReactNode;
  /** One or two supporting sentences under the title. */
  description: React.ReactNode;
  /** Decorative media/demo that fills the cell's free space above the text. */
  visual?: React.ReactNode;
  /** Cell footprint: `"wide"` = 2 columns, `"tall"` = 2 rows, `"lg"` = 2×2. */
  size?: FeatureBentoSize;
}

export interface FeatureBentoProps
  extends Omit<React.HTMLAttributes<HTMLUListElement>, "children"> {
  /** The feature cells, in reading order. */
  items: FeatureBentoItem[];
  /** Column count on wide screens (clamped 1–6). Narrow screens step down. */
  columns?: number;
  /** Accent for the icon tint, pulse halo, and hover glow. Mirrors `--pb-violet`. */
  accent?: string;
}

/**
 * FeatureBento — a bento-grid feature section. Cells span mixed footprints
 * (`sm`, `wide`, `tall`, `lg`) on a dense responsive grid and fade-rise into
 * view with a small per-cell stagger. Hovering a cell wakes a soft accent glow
 * that trails the pointer — one `pointermove` listener per cell writes `--mx`
 * / `--my` straight onto the element, so no React state updates per frame —
 * while the cell border brightens. Each icon sits on a slow-breathing accent
 * halo. The grid collapses to two columns, then one, on narrow viewports
 * while keeping source reading order.
 *
 * Semantics: a real list (`ul`/`li`) with an `h3` + paragraph per cell; the
 * glow, halo, icon, and visual layers are `aria-hidden` decoration. Cells are
 * non-interactive, so no focus management is needed. Under
 * `prefers-reduced-motion` the section renders fully static — no entrance
 * stagger, no glow tracking, and the halo holds one legible frame.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (accent = violet #8b5cf6).
 *
 * @parable/feature-bento
 */
export function FeatureBento({
  items,
  columns = 3,
  accent = "#8b5cf6",
  className,
  style,
  ...props
}: FeatureBentoProps) {
  useInjectedKeyframes(KEYFRAMES_ID, KEYFRAMES_CSS);
  const reduce = useReducedMotionSafe();

  const cols = Math.min(6, Math.max(1, Math.round(columns)));

  /** Write the pointer position into the hovered cell's own CSS vars. */
  const onGlowMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${Math.round(e.clientX - rect.left)}px`);
      el.style.setProperty("--my", `${Math.round(e.clientY - rect.top)}px`);
    },
    []
  );

  const rootStyle = {
    "--pb-fb-cols": String(cols),
    "--pb-fb-accent": accent,
    "--pb-fb-glow": hexToRgba(accent, 0.16),
    "--pb-fb-pulse": hexToRgba(accent, 0.5),
    ...style,
  } as React.CSSProperties;

  return (
    <ul
      role="list"
      className={cn(
        "grid w-full list-none grid-cols-1 gap-4 text-white",
        "[grid-auto-flow:dense]",
        "sm:grid-cols-2 sm:[grid-auto-rows:minmax(10rem,auto)]",
        "lg:[grid-template-columns:repeat(var(--pb-fb-cols),minmax(0,1fr))]",
        className
      )}
      style={rootStyle}
      {...props}
    >
      {items.map((item, i) => {
        const size = item.size ?? "sm";
        // Spans only apply once the grid has 2+ columns, so a phone's single
        // column (and a `columns={1}` grid) never gains an implicit track.
        const spansWide = cols >= 2 && (size === "wide" || size === "lg");
        const spansTall = size === "tall" || size === "lg";
        const delay = r3(Math.min(i * 0.07, 0.56));

        return (
          <li
            key={i}
            className={cn(
              "min-w-0",
              spansWide && "sm:col-span-2",
              spansTall && "sm:row-span-2"
            )}
          >
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 22 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 220, damping: 24, delay }
              }
              onPointerMove={reduce ? undefined : onGlowMove}
              className={cn(
                "group relative flex h-full flex-col overflow-hidden rounded-2xl",
                "border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm",
                "transition-colors duration-300",
                "hover:border-white/25 hover:bg-white/[0.035]"
              )}
              style={{ "--mx": "50%", "--my": "50%" } as React.CSSProperties}
            >
              {/* Pointer-trailing glow — driven purely by the cell's CSS vars. */}
              <div
                aria-hidden
                data-pb-fb-glow
                className={cn(
                  "pointer-events-none absolute inset-0",
                  "opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                )}
                style={{
                  background:
                    "radial-gradient(260px circle at var(--mx) var(--my), var(--pb-fb-glow), transparent 72%)",
                }}
              />

              {item.visual && (
                <div
                  aria-hidden
                  className={cn(
                    "relative mb-5 min-h-24 flex-1 overflow-hidden rounded-xl",
                    "[&_img]:h-full [&_img]:w-full [&_img]:object-cover"
                  )}
                >
                  {item.visual}
                </div>
              )}

              <div className={cn("relative", item.visual && "mt-auto")}>
                {item.icon && (
                  <span aria-hidden className="relative mb-4 inline-flex">
                    <span
                      data-pb-fb-pulse
                      className="absolute inset-0 rounded-xl blur-md"
                      style={{
                        background: "var(--pb-fb-pulse)",
                        animation:
                          "pb-feature-bento-pulse 6s ease-in-out infinite",
                        animationDelay: `${r3((i % 4) * 0.9)}s`,
                      }}
                    />
                    <span
                      className={cn(
                        "relative flex size-10 items-center justify-center rounded-xl",
                        "bg-white/[0.06] text-[var(--pb-fb-accent)] ring-1 ring-white/10",
                        "[&_svg]:size-5"
                      )}
                    >
                      {item.icon}
                    </span>
                  </span>
                )}

                <h3 className="text-base font-semibold tracking-tight text-white">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                  {item.description}
                </p>
              </div>
            </motion.div>
          </li>
        );
      })}
    </ul>
  );
}

export default FeatureBento;
