"use client";

import * as React from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Parse "#rgb" / "#rrggbb" into an `rgba(...)` string at the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = Number.parseInt(h, 16);
  if (Number.isNaN(n)) return `rgba(139, 92, 246, ${alpha})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Max parallax tilt, in degrees, at the pointer-nearest corner. */
const TILT = 6;

export interface ShiftCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Primary heading shown on the resting front face. */
  title: React.ReactNode;
  /** Optional short eyebrow shown above the title. */
  label?: React.ReactNode;
  /** The layer revealed beneath the front face — body copy plus a CTA. */
  detail: React.ReactNode;
  /** When set, the whole card renders as an `<a>` link to this href. */
  href?: string;
  /** Anchor target, applied only when `href` is set. */
  target?: React.HTMLAttributeAnchorTarget;
  /** Anchor rel, applied only when `href` is set. */
  rel?: string;
  /** Accent for the pointer glow, baseline bar, arrow, and focus ring. */
  accent?: string;
}

/**
 * ShiftCard — a layered card whose front face (title + short label) slides and
 * fades up on hover/focus to reveal a detail layer beneath (body copy + a CTA),
 * while the whole card takes a subtle spring-smoothed parallax tilt toward the
 * pointer (~6deg max) and a soft accent glow tracks the cursor. Renders as an
 * `<a>` when `href` is given, otherwise a focusable container. The reveal is
 * CSS-driven off `group-hover` / `group-focus-within`, so full keyboard focus
 * reveals the detail with no JS, and a `:focus-visible` ring lands on the card.
 *
 * Under `prefers-reduced-motion` there is no tilt and no slide: the detail is
 * revealed with a plain opacity cross-fade and every layer stays legible.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (accent = violet #8b5cf6,
 * ring offset = ink #0f0f10); pair with fuchsia #ec4899, ember #f5a623, or
 * signal cyan #22d3ee.
 *
 * @parable/shift-card
 */
export function ShiftCard({
  title,
  label,
  detail,
  href,
  target,
  rel,
  accent = "#8b5cf6",
  className,
  style,
  ...rest
}: ShiftCardProps) {
  const reduce = useReducedMotion();
  const rootRef = React.useRef<HTMLElement>(null);

  // Pointer position: px/py in [-0.5, 0.5] drive the tilt; gx/gy in % drive
  // the glow. All start deterministic (0 / centre) so SSR and client agree.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);

  const tiltCfg = { stiffness: 210, damping: 20, mass: 0.5 } as const;
  const glowCfg = { stiffness: 260, damping: 26, mass: 0.4 } as const;
  const sx = useSpring(px, tiltCfg);
  const sy = useSpring(py, tiltCfg);
  const sgx = useSpring(gx, glowCfg);
  const sgy = useSpring(gy, glowCfg);

  const rotateY = useTransform(sx, [-0.5, 0.5], [-TILT, TILT]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [TILT, -TILT]);

  const glowColor = React.useMemo(() => hexToRgba(accent, 0.24), [accent]);
  const glow = useMotionTemplate`radial-gradient(240px circle at ${sgx}% ${sgy}%, ${glowColor}, transparent 72%)`;

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (reduce) return;
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;
      px.set(nx - 0.5);
      py.set(ny - 0.5);
      // Rounded so no full-precision float reaches an inline style string.
      gx.set(Math.round(nx * 1000) / 10);
      gy.set(Math.round(ny * 1000) / 10);
    },
    [reduce, px, py, gx, gy]
  );

  const handlePointerLeave = React.useCallback(() => {
    px.set(0);
    py.set(0);
    gx.set(50);
    gy.set(50);
  }, [px, py, gx, gy]);

  const isLink = href != null;
  const Root = (isLink ? "a" : "div") as React.ElementType;

  const ease = "ease-[cubic-bezier(0.22,1,0.36,1)]";

  return (
    <Root
      ref={rootRef}
      href={isLink ? href : undefined}
      target={isLink ? target : undefined}
      rel={
        isLink
          ? rel ?? (target === "_blank" ? "noreferrer noopener" : undefined)
          : undefined
      }
      role={isLink ? undefined : "group"}
      tabIndex={isLink ? undefined : 0}
      aria-label={typeof title === "string" ? title : undefined}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        { "--pb-sc-accent": accent, ...style } as React.CSSProperties
      }
      className={cn(
        "group relative block overflow-hidden rounded-2xl no-underline",
        "border border-white/10 bg-white/[0.025] text-white",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_18px_40px_-24px_rgba(0,0,0,0.7)]",
        "transition-colors duration-300",
        "hover:border-[var(--pb-sc-accent)]/45 focus-within:border-[var(--pb-sc-accent)]/45",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--pb-sc-accent)]",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f10]",
        isLink && "cursor-pointer",
        className
      )}
      {...rest}
    >
      <motion.div
        className="relative h-full w-full"
        style={{
          rotateX: reduce ? 0 : rotateX,
          rotateY: reduce ? 0 : rotateY,
          transformPerspective: 820,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Cursor-tracking accent glow. */}
        <motion.span
          aria-hidden
          style={{ background: glow }}
          className={cn(
            "pointer-events-none absolute inset-0 z-0 opacity-0",
            "transition-opacity duration-500",
            "group-hover:opacity-100 group-focus-within:opacity-100"
          )}
        />

        {/* Corner affordance that eases in on reveal. */}
        <span
          aria-hidden
          className={cn(
            "absolute right-4 top-4 z-20 grid size-8 place-items-center rounded-full",
            "bg-[var(--pb-sc-accent)]/12 text-[var(--pb-sc-accent)]",
            "opacity-0 transition-[transform,opacity] duration-500",
            ease,
            "motion-safe:translate-x-1 motion-safe:-translate-y-1",
            "group-hover:opacity-100 group-focus-within:opacity-100",
            "motion-safe:group-hover:translate-x-0 motion-safe:group-hover:translate-y-0",
            "motion-safe:group-focus-within:translate-x-0 motion-safe:group-focus-within:translate-y-0"
          )}
        >
          <ArrowUpRight className="size-4" strokeWidth={2.25} />
        </span>

        <div className="relative flex min-h-[10rem] flex-col">
          {/* Revealed detail layer, sitting beneath the front face. */}
          <div
            className={cn(
              "absolute inset-0 z-0 flex flex-col justify-end gap-3 p-5",
              "text-sm leading-relaxed text-white/70",
              "pointer-events-none opacity-0",
              "transition-[transform,opacity] duration-500 will-change-transform",
              ease,
              "motion-safe:translate-y-4",
              "group-hover:pointer-events-auto group-focus-within:pointer-events-auto",
              "group-hover:opacity-100 group-focus-within:opacity-100",
              "motion-safe:group-hover:translate-y-0 motion-safe:group-focus-within:translate-y-0",
              "[&_a]:font-medium [&_a]:text-[var(--pb-sc-accent)]"
            )}
          >
            {detail}
          </div>

          {/* Front face — slides up and fades away to reveal the detail. */}
          <div
            className={cn(
              "relative z-10 flex flex-1 flex-col justify-end gap-1.5 p-5",
              "transition-[transform,opacity] duration-500 will-change-transform",
              ease,
              "group-hover:pointer-events-none group-focus-within:pointer-events-none",
              "group-hover:opacity-0 group-focus-within:opacity-0",
              "motion-safe:group-hover:-translate-y-4 motion-safe:group-focus-within:-translate-y-4"
            )}
          >
            {label != null && (
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--pb-sc-accent)]">
                {label}
              </span>
            )}
            <span className="text-[15px] font-semibold leading-snug tracking-tight text-white">
              {title}
            </span>
          </div>
        </div>

        {/* Baseline accent bar that grows in (or fades in when motion is off). */}
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 h-[2px] origin-left bg-[var(--pb-sc-accent)]",
            "opacity-0 transition-[transform,opacity] duration-500",
            ease,
            "motion-safe:scale-x-0 motion-safe:opacity-100",
            "group-hover:opacity-100 group-focus-within:opacity-100",
            "motion-safe:group-hover:scale-x-100 motion-safe:group-focus-within:scale-x-100"
          )}
        />
      </motion.div>
    </Root>
  );
}

export default ShiftCard;
