"use client";

import * as React from "react";
import {
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

/** Inject one shared <style> tag (id-guarded) that owns this component's keyframes. */
function useInjectedKeyframes(id: string, css: string): void {
  React.useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/* A stylesheet `!important` rule beats a normal inline style, so the media
   query below freezes the inline glow `animation` under reduced motion; each
   glow keeps its static inline opacity as the legible fallback frame. */
const KEYFRAMES = `
@keyframes pb-hero-section-glow-a {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.45; }
  50% { transform: translate3d(6%, 9%, 0) scale(1.12); opacity: 0.62; }
}
@keyframes pb-hero-section-glow-b {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.38; }
  50% { transform: translate3d(-7%, -8%, 0) scale(1.1); opacity: 0.55; }
}
@media (prefers-reduced-motion: reduce) {
  [data-pb-hero-glow] { animation: none !important; transform: none !important; }
}
`;

/**
 * If `title` is a plain string containing `accentWord`, wrap that word's first
 * occurrence in a gradient-clipped span; otherwise the title passes through
 * untouched (ReactNode titles style themselves).
 */
function renderAccentedTitle(
  title: React.ReactNode,
  accentWord?: string
): React.ReactNode {
  if (typeof title !== "string" || !accentWord) return title;
  const idx = title.indexOf(accentWord);
  if (idx === -1) return title;
  return (
    <>
      {title.slice(0, idx)}
      <span
        className="bg-clip-text text-transparent"
        style={{
          backgroundImage:
            "linear-gradient(92deg, var(--pb-hero-accent), var(--pb-hero-accent-alt))",
        }}
      >
        {accentWord}
      </span>
      {title.slice(idx + accentWord.length)}
    </>
  );
}

/**
 * One CTA. A real `<button>` by default; becomes an anchor only when the
 * consumer passes `href` (marketing-block convention).
 */
function HeroAction({
  label,
  href,
  onClick,
  variant,
}: {
  label: string;
  href?: string;
  onClick?: () => void;
  variant: "primary" | "secondary";
}) {
  const cls = cn(
    "group inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold",
    "cursor-pointer no-underline outline-none",
    "transition-[transform,background-color,filter] duration-200",
    "active:scale-[0.97]",
    "focus-visible:ring-2 focus-visible:ring-[var(--pb-hero-accent)]",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
    variant === "primary"
      ? "bg-[var(--pb-hero-accent)] text-white hover:brightness-110"
      : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
  );
  const inner = (
    <>
      {label}
      {variant === "primary" && (
        <ArrowRight
          aria-hidden
          strokeWidth={2.5}
          className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
        />
      )}
    </>
  );
  if (href) {
    return (
      <a href={href} onClick={onClick} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

export interface HeroStat {
  /** The figure, e.g. `"12k"`. */
  value: string;
  /** What it counts, e.g. `"stars"`. */
  label: string;
}

export interface HeroSectionProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Small mono uppercase kicker above the headline. */
  eyebrow?: string;
  /** The headline. Pass a string to let `accentWord` gradient-wrap one word. */
  title: React.ReactNode;
  /** Substring of a string `title` to paint with the accent gradient. */
  accentWord?: string;
  /** Supporting paragraph under the headline. */
  subtitle?: React.ReactNode;
  /** Primary CTA text. Omit to hide the button. */
  primaryLabel?: string;
  /** Fires when the primary CTA is pressed. */
  onPrimary?: () => void;
  /** Renders the primary CTA as a real `<a>` pointing here. */
  primaryHref?: string;
  /** Secondary CTA text. Omit to hide the button. */
  secondaryLabel?: string;
  /** Fires when the secondary CTA is pressed. */
  onSecondary?: () => void;
  /** Renders the secondary CTA as a real `<a>` pointing here. */
  secondaryHref?: string;
  /** Mono proof-point row under everything, e.g. 12k stars · 400+ teams. */
  stats?: HeroStat[];
  /** Gradient/glow start colour and CTA fill. Mirrors `--pb-violet`. */
  accent?: string;
  /** Gradient/glow end colour. Mirrors `--pb-fuchsia`. */
  accentAlt?: string;
  /** Extra content rendered below the actions (e.g. a screenshot or badge). */
  children?: React.ReactNode;
}

/**
 * HeroSection — a complete marketing hero block: mono uppercase eyebrow, a big
 * tracking-tight headline with one gradient-accented word, subcopy, a
 * primary/secondary action pair, and a mono stats row, all rising in with a
 * soft spring stagger on mount. Behind the copy, two blurred radial glows
 * drift on slow keyframe orbits for ambient depth. CTAs render real
 * `<button>` elements wired to `onPrimary`/`onSecondary` by default and only
 * become anchors when `primaryHref`/`secondaryHref` is passed. The hidden
 * mount frame never branches on client state, so the server render and first
 * client render match exactly. Fully keyboard operable with `:focus-visible`
 * rings; the glow layer is `aria-hidden`. Under `prefers-reduced-motion` the
 * stagger collapses to an instant reveal and the glows hold a static frame.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (violet #8b5cf6 →
 * fuchsia #ec4899, designed against ink #0f0f10).
 *
 * @parable/hero-section
 */
export function HeroSection({
  eyebrow,
  title,
  accentWord,
  subtitle,
  primaryLabel,
  onPrimary,
  primaryHref,
  secondaryLabel,
  onSecondary,
  secondaryHref,
  stats,
  accent = "#8b5cf6",
  accentAlt = "#ec4899",
  className,
  children,
  style,
  ...props
}: HeroSectionProps) {
  useInjectedKeyframes("pb-hero-section-kf", KEYFRAMES);
  const reduce = useReducedMotion() ?? false;

  /* Only transitions branch on `reduce` — variant *values* stay identical, so
     SSR markup (rendered from the "hidden" frame) always equals the first
     client render, and reduced-motion users get an instant, stagger-free
     reveal instead of the rise. */
  const itemTransition: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 220, damping: 24, mass: 0.9 };

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: reduce
        ? { duration: 0 }
        : { staggerChildren: 0.09, delayChildren: 0.08 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: itemTransition },
  };

  const rootStyle = {
    "--pb-hero-accent": accent,
    "--pb-hero-accent-alt": accentAlt,
    ...style,
  } as React.CSSProperties;

  const hasActions = Boolean(primaryLabel || secondaryLabel);

  return (
    <section
      className={cn("relative overflow-hidden text-white", className)}
      style={rootStyle}
      {...props}
    >
      {/* Ambient glow backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span
          data-pb-hero-glow
          className="absolute rounded-full blur-3xl"
          style={{
            left: "-8%",
            top: "-24%",
            width: "48%",
            height: "64%",
            opacity: 0.45,
            background: `radial-gradient(50% 50% at 50% 50%, ${hexToRgba(accent, 0.5)}, transparent 72%)`,
            animation: "pb-hero-section-glow-a 13s ease-in-out infinite",
          }}
        />
        <span
          data-pb-hero-glow
          className="absolute rounded-full blur-3xl"
          style={{
            right: "-10%",
            bottom: "-28%",
            width: "52%",
            height: "68%",
            opacity: 0.38,
            background: `radial-gradient(50% 50% at 50% 50%, ${hexToRgba(accentAlt, 0.42)}, transparent 72%)`,
            animation: "pb-hero-section-glow-b 17s ease-in-out infinite",
          }}
        />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-16 text-center sm:py-24"
      >
        {eyebrow && (
          <motion.p
            variants={itemVariants}
            className="font-mono text-[0.6875rem] font-medium uppercase tracking-[0.25em] text-white/50 sm:text-xs"
          >
            {eyebrow}
          </motion.p>
        )}

        <motion.h1
          variants={itemVariants}
          className="mt-4 text-balance text-4xl font-semibold leading-[1.06] tracking-tight sm:text-5xl md:text-6xl"
        >
          {renderAccentedTitle(title, accentWord)}
        </motion.h1>

        {subtitle && (
          <motion.p
            variants={itemVariants}
            className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/60 sm:text-lg"
          >
            {subtitle}
          </motion.p>
        )}

        {hasActions && (
          <motion.div
            variants={itemVariants}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            {primaryLabel && (
              <HeroAction
                variant="primary"
                label={primaryLabel}
                onClick={onPrimary}
                href={primaryHref}
              />
            )}
            {secondaryLabel && (
              <HeroAction
                variant="secondary"
                label={secondaryLabel}
                onClick={onSecondary}
                href={secondaryHref}
              />
            )}
          </motion.div>
        )}

        {children && (
          <motion.div variants={itemVariants} className="mt-8 w-full">
            {children}
          </motion.div>
        )}

        {stats && stats.length > 0 && (
          <motion.ul
            variants={itemVariants}
            role="list"
            className="mt-10 flex list-none flex-wrap items-center justify-center gap-x-3 gap-y-2 font-mono text-xs tracking-wider text-white/45 sm:mt-12"
          >
            {stats.map((stat, i) => (
              <li key={i} className="flex items-center gap-3">
                {i > 0 && (
                  <span aria-hidden className="text-white/20">
                    ·
                  </span>
                )}
                <span className="whitespace-nowrap">
                  <span className="font-semibold text-white/90">
                    {stat.value}
                  </span>{" "}
                  {stat.label}
                </span>
              </li>
            ))}
          </motion.ul>
        )}
      </motion.div>
    </section>
  );
}

export default HeroSection;
