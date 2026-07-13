"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Round a float to 3 decimals — full-precision floats trip React hydration. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

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

/** Live-updating `prefers-reduced-motion` flag (SSR-safe: starts `false`). */
function usePrefersReducedMotion(): boolean {
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

/* The track holds two identical halves, so -50% lands exactly on frame one —
   a seamless loop. Hover or keyboard focus anywhere in a row pauses that row.
   The media query is a first-paint guard: the hook below swaps reduced-motion
   users to a static grid after hydration, and a stylesheet `!important` rule
   beats the inline `animation` for the frames before that swap. */
const KEYFRAMES = `
@keyframes pb-testimonial-marquee-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
[data-pb-tm-row]:hover [data-pb-tm-track],
[data-pb-tm-row]:focus-within [data-pb-tm-track] {
  animation-play-state: paused;
}
@media (prefers-reduced-motion: reduce) {
  [data-pb-tm-track] { animation: none !important; }
}
`;

/** Brand accents cycled across cards. Mirrors the site `--pb-*` tokens. */
const ACCENTS = ["#8b5cf6", "#ec4899", "#f5a623", "#22d3ee"] as const;

/** First + last initial of `name`, uppercased — the avatar-disc fallback. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase() || "?";
}

export interface Testimonial {
  /** The quote body. Rendered inside a real `<blockquote>`. */
  quote: string;
  /** Author name — also seeds the initials-disc avatar fallback. */
  name: string;
  /** Optional role / company line under the name. */
  role?: string;
  /** Optional avatar image URL. Falls back to an initials disc. */
  avatar?: string;
}

export interface TestimonialMarqueeProps
  extends React.HTMLAttributes<HTMLElement> {
  /** The testimonials, distributed round-robin across the rows. */
  testimonials: Testimonial[];
  /** How many scrolling rows to render (clamped to the testimonial count). */
  rows?: number;
  /** Seconds one full loop takes. Lower is faster. */
  speed?: number;
}

function TestimonialCard({
  testimonial,
  accent,
  interactive,
  inGrid,
}: {
  testimonial: Testimonial;
  accent: string;
  /** Real card: keyboard-focusable so tabbing in pauses the row. */
  interactive: boolean;
  inGrid: boolean;
}) {
  return (
    <figure
      tabIndex={interactive ? 0 : undefined}
      style={{ "--pb-tm-accent": accent } as React.CSSProperties}
      className={cn(
        "flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5",
        "text-left backdrop-blur-sm",
        "transition-[border-color,background-color] duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
        "hover:border-white/20 hover:bg-white/[0.045]",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--pb-tm-accent)]",
        inGrid ? "h-full w-full" : "w-72 shrink-0 sm:w-80"
      )}
    >
      <blockquote className="text-sm leading-relaxed text-white/75">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>

      <figcaption className="mt-auto flex items-center gap-3">
        {testimonial.avatar ? (
          <img
            src={testimonial.avatar}
            alt=""
            loading="lazy"
            className="size-10 shrink-0 rounded-full object-cover ring-1 ring-white/15"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold ring-1 ring-inset ring-white/10"
            style={{ backgroundColor: `${accent}1f`, color: accent }}
          >
            {initialsOf(testimonial.name)}
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">
            {testimonial.name}
          </span>
          {testimonial.role && (
            <span className="block truncate text-xs text-white/50">
              {testimonial.role}
            </span>
          )}
        </span>
      </figcaption>
    </figure>
  );
}

/**
 * TestimonialMarquee — a wall of testimonial rows scrolling infinitely in
 * alternating directions. Each row's track holds two identical halves and
 * animates `translateX(-50%)` on a loop, so the seam never shows; short rows
 * are tiled with extra `aria-hidden` passes so the track always outruns the
 * viewport. Hovering a row — or tabbing onto any card, each of which is a
 * focusable `<figure>` — pauses just that row so the quote can be read. The
 * first pass of the first half carries the real list semantics
 * (`ul`/`li`/`blockquote`/`figcaption`); every repeated pass and the entire
 * second half are `aria-hidden` and unfocusable, so assistive tech hears each
 * quote exactly once. Cards show an initials disc when no avatar URL is given,
 * cycling accents through the brand palette, and the row edges fade out via a
 * CSS mask.
 *
 * Under `prefers-reduced-motion` the marquee collapses to a static wrapped
 * grid of every testimonial — no scroll, no duplicates.
 *
 * Accent cycle (violet #8b5cf6 / fuchsia #ec4899 / ember #f5a623 / signal
 * #22d3ee) mirrors the site's `--pb-*` tokens.
 *
 * @parable/testimonial-marquee
 */
export function TestimonialMarquee({
  testimonials,
  rows = 2,
  speed = 40,
  className,
  ...props
}: TestimonialMarqueeProps) {
  useInjectedKeyframes("pb-testimonial-marquee-kf", KEYFRAMES);
  const reduce = usePrefersReducedMotion();

  const rowCount = Math.max(
    1,
    Math.min(Math.floor(rows), Math.max(1, testimonials.length))
  );

  // Round-robin distribution: row r owns testimonials[r], [r + rowCount], …
  // Each item keeps its global index so its accent is stable across layouts.
  const rowItems = React.useMemo(() => {
    const out: Array<Array<{ t: Testimonial; accent: string }>> = Array.from(
      { length: rowCount },
      () => []
    );
    testimonials.forEach((t, i) => {
      out[i % rowCount].push({ t, accent: ACCENTS[i % ACCENTS.length] });
    });
    return out;
  }, [testimonials, rowCount]);

  // Focusing a partially clipped card makes the browser scroll the hidden
  // overflow; pin it back so the mask and loop geometry stay intact.
  const resetScroll = (e: React.UIEvent<HTMLDivElement>) => {
    e.currentTarget.scrollLeft = 0;
  };

  if (testimonials.length === 0) return null;

  // Static fallback: one wrapped grid, real semantics, nothing duplicated.
  if (reduce) {
    return (
      <section
        aria-label="Testimonials"
        className={cn("w-full", className)}
        {...props}
      >
        <ul
          role="list"
          className="grid list-none gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {testimonials.map((t, i) => (
            <li key={i} className="min-w-0">
              <TestimonialCard
                testimonial={t}
                accent={ACCENTS[i % ACCENTS.length]}
                interactive={false}
                inGrid
              />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section
      aria-label="Testimonials"
      className={cn("flex w-full flex-col gap-4", className)}
      {...props}
    >
      {rowItems.map((items, r) => {
        // Tile short rows so each half of the track comfortably exceeds the
        // viewport (~8 cards ≈ 2,700px). Deterministic, so SSR markup matches.
        const passes = Math.max(1, Math.ceil(8 / items.length));
        const duration = r3(speed * (1 + r * 0.12));
        const delay = r3(-((r * speed) / Math.max(2, rowCount)));

        const half = (hiddenHalf: boolean) => {
          const cards = Array.from({ length: passes }, (_, p) =>
            items.map(({ t, accent }, i) => {
              const real = !hiddenHalf && p === 0;
              const card = (
                <TestimonialCard
                  testimonial={t}
                  accent={accent}
                  interactive={real}
                  inGrid={false}
                />
              );
              return real ? (
                <li key={`${p}-${i}`} className="flex">
                  {card}
                </li>
              ) : (
                <li key={`${p}-${i}`} aria-hidden className="flex">
                  {card}
                </li>
              );
            })
          ).flat();
          return hiddenHalf ? (
            <ul aria-hidden className="flex list-none gap-4 pr-4">
              {cards}
            </ul>
          ) : (
            <ul role="list" className="flex list-none gap-4 pr-4">
              {cards}
            </ul>
          );
        };

        return (
          <div
            key={r}
            data-pb-tm-row
            onScroll={resetScroll}
            className="w-full overflow-hidden"
            style={{
              maskImage:
                "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            }}
          >
            <div
              data-pb-tm-track
              className="flex w-max will-change-transform"
              style={{
                animation: `pb-testimonial-marquee-scroll ${duration}s linear infinite`,
                animationDirection: r % 2 === 1 ? "reverse" : "normal",
                animationDelay: `${delay}s`,
              }}
            >
              {half(false)}
              {half(true)}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export default TestimonialMarquee;
