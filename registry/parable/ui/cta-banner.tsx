"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* Brand palette — mirrors the site's `--pb-*` tokens.
   violet #8b5cf6 · fuchsia #ec4899 · ember #f5a623 · signal #22d3ee · ink #0f0f10 */
const INK = "#0f0f10";

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
   query below freezes the inline `animation` under reduced motion: the aurora
   holds its static inline `background-position` and the glow holds its static
   inline `opacity`, both remaining fully legible as the fallback frame. */
const KEYFRAMES = `
@keyframes pb-cta-banner-drift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
@keyframes pb-cta-banner-glow {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.72; transform: scale(1.08); }
}
@media (prefers-reduced-motion: reduce) {
  [data-pb-cta-anim] { animation: none !important; transform: none !important; }
}
`;

/**
 * If `title` contains `accentWord`, wrap that word's first occurrence in a
 * gradient-clipped span; otherwise the title passes through untouched.
 */
function renderAccentedTitle(
  title: string,
  accentWord?: string
): React.ReactNode {
  if (!accentWord) return title;
  const idx = title.indexOf(accentWord);
  if (idx === -1) return title;
  return (
    <>
      {title.slice(0, idx)}
      <span
        className="bg-clip-text text-transparent"
        style={{
          backgroundImage: "linear-gradient(92deg, #8b5cf6, #ec4899, #f5a623)",
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
function CtaAction({
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
    "group/btn relative inline-flex items-center justify-center gap-2",
    "rounded-full px-6 py-3 text-sm font-semibold",
    "cursor-pointer no-underline outline-none",
    "transition-[transform,box-shadow,background-color,filter] duration-200",
    "[transition-timing-function:cubic-bezier(.22,1,.36,1)]",
    "active:scale-[0.97]",
    "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f10]",
    variant === "primary"
      ? cn(
          "text-white shadow-lg shadow-[#8b5cf6]/30",
          "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#8b5cf6]/40",
          "focus-visible:ring-[#c4b5fd]"
        )
      : cn(
          "border border-white/15 bg-white/[0.04] text-white/90 backdrop-blur-sm",
          "hover:bg-white/10 hover:text-white",
          "focus-visible:ring-white/60"
        )
  );
  const style: React.CSSProperties | undefined =
    variant === "primary"
      ? { backgroundImage: "linear-gradient(100deg, #8b5cf6, #ec4899)" }
      : undefined;
  const inner = (
    <>
      {label}
      {variant === "primary" && (
        <ArrowRight
          aria-hidden
          strokeWidth={2.5}
          className="size-4 transition-transform duration-200 group-hover/btn:translate-x-0.5"
        />
      )}
    </>
  );
  if (href) {
    return (
      <a href={href} onClick={onClick} className={cls} style={style}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} style={style}>
      {inner}
    </button>
  );
}

export interface CtaBannerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Headline. Pair with `accentWord` to gradient-highlight one word. */
  title: string;
  /** Optional supporting line under the title. */
  subtitle?: string;
  /** Primary button label. */
  primaryLabel: string;
  /** Click handler for the primary button. */
  onPrimary?: () => void;
  /** If set, the primary CTA renders as a real `<a href>` instead of a button. */
  primaryHref?: string;
  /** Optional secondary button label. Omit to render only the primary CTA. */
  secondaryLabel?: string;
  /** Click handler for the secondary button. */
  onSecondary?: () => void;
  /** If set, the secondary CTA renders as a real `<a href>` instead of a button. */
  secondaryHref?: string;
  /** Content alignment within the panel. */
  align?: "center" | "left";
  /** A word inside `title` to render with the brand gradient. */
  accentWord?: string;
}

/**
 * CtaBanner — a closing call-to-action band. A rounded ink panel carries a slow
 * aurora gradient that drifts across its surface (a blurred multi-stop gradient
 * whose `background-position` sweeps via injected keyframes) over a faint,
 * edge-masked dotted grid; a soft glow pulses behind the primary button. The
 * headline can gradient-highlight one `accentWord`, a subtitle sits below, and
 * primary/secondary CTAs render as real `<button>`s by default — becoming
 * anchors only when the consumer passes `primaryHref` / `secondaryHref`
 * (marketing-block convention). Content aligns center or left.
 *
 * The animation is pure CSS, so server and first client render are identical
 * (SSR-safe). Under `prefers-reduced-motion` a stylesheet `!important` rule
 * freezes the drift and pulse: the aurora holds a static, legible gradient and
 * the glow holds a steady opacity. Decorative layers are `aria-hidden`; the
 * panel is a labelled `<section>` and both CTAs are keyboard operable with a
 * visible `:focus-visible` ring.
 *
 * Colours mirror the site's `--pb-*` tokens (violet #8b5cf6, fuchsia #ec4899,
 * ember #f5a623, signal #22d3ee, ink #0f0f10).
 *
 * @parable/cta-banner
 */
export function CtaBanner({
  title,
  subtitle,
  primaryLabel,
  onPrimary,
  primaryHref,
  secondaryLabel,
  onSecondary,
  secondaryHref,
  align = "center",
  accentWord,
  className,
  style,
  ...props
}: CtaBannerProps) {
  useInjectedKeyframes("pb-cta-banner-kf", KEYFRAMES);

  const reactId = React.useId();
  const titleId = `pb-cta-title-${reactId}`;
  const left = align === "left";

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "relative isolate overflow-hidden rounded-3xl border border-white/10",
        "px-6 py-14 sm:px-10 sm:py-16 lg:px-14 lg:py-20",
        className
      )}
      style={{ backgroundColor: INK, ...style }}
      {...props}
    >
      {/* Aurora sweep — blurred multi-stop gradient drifting along the surface. */}
      <div
        aria-hidden
        data-pb-cta-anim
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(110deg, #8b5cf6 0%, #ec4899 28%, #f5a623 52%, #22d3ee 76%, #8b5cf6 100%)",
          backgroundSize: "220% 220%",
          backgroundPosition: "50% 50%",
          opacity: 0.28,
          filter: "blur(44px)",
          mixBlendMode: "screen",
          animation: "pb-cta-banner-drift 18s ease-in-out infinite",
        }}
      />

      {/* Faint dotted-grid texture, masked to fade toward the panel edges. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, #000 32%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 80% at 50% 50%, #000 32%, transparent 78%)",
        }}
      />

      {/* Soft top highlight for depth. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
        style={{
          background:
            "radial-gradient(60% 70% at 50% 0%, rgba(139,92,246,0.18), transparent 72%)",
        }}
      />

      <div
        className={cn(
          "relative z-10 mx-auto flex max-w-3xl flex-col gap-5",
          left ? "items-start text-left" : "items-center text-center"
        )}
      >
        <h2
          id={titleId}
          className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
        >
          {renderAccentedTitle(title, accentWord)}
        </h2>

        {subtitle && (
          <p className="max-w-xl text-pretty text-base leading-relaxed text-white/60 sm:text-lg">
            {subtitle}
          </p>
        )}

        <div
          className={cn(
            "mt-3 flex flex-wrap gap-3",
            left ? "justify-start" : "justify-center"
          )}
        >
          {/* Primary CTA with a glow that gently pulses behind it. */}
          <span className="relative isolate inline-flex">
            <span
              aria-hidden
              data-pb-cta-anim
              className="pointer-events-none absolute -inset-3 -z-10 rounded-full"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(139,92,246,0.55), rgba(139,92,246,0) 78%)",
                filter: "blur(14px)",
                opacity: 0.5,
                animation: "pb-cta-banner-glow 3.4s ease-in-out infinite",
              }}
            />
            <CtaAction
              label={primaryLabel}
              href={primaryHref}
              onClick={onPrimary}
              variant="primary"
            />
          </span>

          {secondaryLabel && (
            <CtaAction
              label={secondaryLabel}
              href={secondaryHref}
              onClick={onSecondary}
              variant="secondary"
            />
          )}
        </div>
      </div>
    </section>
  );
}

export default CtaBanner;
