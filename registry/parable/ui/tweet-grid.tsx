"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { BadgeCheck, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/** Unique id for the injected keyframes block (one per document). */
const KEYFRAMES_ID = "pb-tweet-grid-kf";

/**
 * A single slow sheen that sweeps across a media placeholder. Injected once
 * per document; gated off under reduced motion via `motion-reduce:hidden` on
 * the element that references it, so this stylesheet stays animation-only.
 */
const KEYFRAMES_CSS = `
@keyframes pb-tweet-grid-sheen {
  0%   { transform: translateX(-160%) skewX(-12deg); }
  55%  { transform: translateX(320%) skewX(-12deg); }
  100% { transform: translateX(320%) skewX(-12deg); }
}
`;

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

/** Group digits with commas without locale drift (hydration-safe). */
function withCommas(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Compact like counts: 1284 -> "1.3K", 5_600_000 -> "5.6M". */
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${Math.round((n / 1_000_000) * 10) / 10}M`;
  if (n >= 1_000) return `${Math.round((n / 1_000) * 10) / 10}K`;
  return String(Math.round(n));
}

/** Up-to-two-letter initials from a display name. */
function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1] ?? "" : "";
  const s = last ? first.charAt(0) + last.charAt(0) : first.slice(0, 2);
  return s.toUpperCase() || "?";
}

/** Avatar: `<img>` for a URL string, a passed node, else initials on a gradient. */
function Avatar({
  avatar,
  name,
}: {
  avatar?: string | React.ReactNode;
  name: string;
}): React.ReactElement {
  const base =
    "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/10";
  if (typeof avatar === "string" && avatar) {
    return (
      <span className={cn(base, "bg-white/5")} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }
  if (avatar) {
    return (
      <span
        className={cn(
          base,
          "bg-white/5 [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_svg]:size-5"
        )}
        aria-hidden
      >
        {avatar}
      </span>
    );
  }
  return (
    <span
      className={cn(
        base,
        "bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] text-xs font-semibold text-white"
      )}
      aria-hidden
    >
      {initialsFrom(name)}
    </span>
  );
}

export interface Tweet {
  /** Display name. */
  name: string;
  /** Handle without the leading `@`. */
  handle: string;
  /** Avatar URL, a custom node, or omit for auto initials. */
  avatar?: string | React.ReactNode;
  /** Testimonial body text. */
  body: string;
  /** Shows a verified badge beside the name. */
  verified?: boolean;
  /** Like count for the footer row. Omit to hide the row. */
  likes?: number;
  /** Profile URL — turns the handle into a real, labelled anchor. */
  href?: string;
  /** Optional media placeholder: an image URL or any node. */
  media?: string | React.ReactNode;
}

export interface TweetGridProps
  extends Omit<React.HTMLAttributes<HTMLUListElement>, "children"> {
  /** Demo/testimonial data. No live API — the wall renders what you pass. */
  tweets: Tweet[];
  /** Maximum columns (default 3). Fewer are used as the container narrows. */
  columns?: number;
  className?: string;
}

/**
 * TweetGrid — a masonry-ish testimonial wall. Cards fade and rise into view
 * with a staggered column cascade (delay derived from each card's row/column
 * so columns sweep down in parallel), and lift on hover. Layout is pure CSS
 * multi-column (`column-count` capped, `column-width` floor) so it steps down
 * to fewer columns on narrow containers with no JS measuring, while DOM order —
 * and therefore screen-reader reading order — stays the input order. Each card
 * shows an avatar (initials fallback), name + verified badge, a real anchor for
 * the handle when `href` is given, body text, an optional media placeholder
 * with a slow sheen, and a subtle like row. A semantic `<ul>`/`<li>` list.
 *
 * Under `prefers-reduced-motion` the grid is fully static — no entrance
 * stagger, no hover lift, no sheen — and every card renders legibly at rest.
 *
 * Accent defaults mirror the site's `--pb-*` tokens (verified = signal
 * #22d3ee, like = fuchsia #ec4899, focus ring = violet #8b5cf6) on ink
 * #0f0f10; override via the exposed `--pb-tg-*` CSS variables.
 *
 * @parable/tweet-grid
 */
export function TweetGrid({
  tweets,
  columns = 3,
  className,
  style,
  ...props
}: TweetGridProps) {
  const reduce = useReducedMotionSafe();
  useInjectedKeyframes(KEYFRAMES_ID, KEYFRAMES_CSS);

  const cols = Math.max(1, Math.floor(columns));
  const perColumn = Math.max(1, Math.ceil(tweets.length / cols));

  const ROW_STEP = 0.06;
  const COL_STEP = 0.035;
  const MAX_DELAY = 0.6;

  const rootStyle = {
    columnCount: cols,
    columnWidth: "16rem",
    columnGap: "1rem",
    columnFill: "balance",
    "--pb-tg-verified": "#22d3ee",
    "--pb-tg-like": "#ec4899",
    "--pb-tg-ring": "#8b5cf6",
    "--pb-tg-ink": "#0f0f10",
    ...style,
  } as React.CSSProperties;

  return (
    <ul
      aria-label="Testimonials"
      className={cn("m-0 list-none p-0", className)}
      style={rootStyle}
      {...props}
    >
      {tweets.map((t, i) => {
        const row = i % perColumn;
        const col = Math.floor(i / perColumn);
        const delay =
          Math.round(
            Math.min(row * ROW_STEP + col * COL_STEP, MAX_DELAY) * 1000
          ) / 1000;
        const likes = t.likes;
        const sheenDelay = Math.round((i % 5) * 0.35 * 1000) / 1000;

        return (
          <li key={`${t.handle}-${i}`} className="mb-4 break-inside-avoid">
            <motion.div
              className={cn(
                "group relative rounded-2xl border border-white/10",
                "bg-white/[0.02] p-5 text-white shadow-sm backdrop-blur-sm",
                "transition-colors duration-300",
                "hover:border-white/20 hover:bg-white/[0.04]",
                "focus-within:border-[color:var(--pb-tg-ring)]/50"
              )}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              whileHover={reduce ? undefined : { y: -4 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 210, damping: 22, delay }
              }
            >
              <div className="flex items-center gap-3">
                <Avatar avatar={t.avatar} name={t.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-sm font-semibold text-white">
                      {t.name}
                    </span>
                    {t.verified && (
                      <span className="inline-flex shrink-0 items-center text-[color:var(--pb-tg-verified)]">
                        <BadgeCheck
                          aria-hidden
                          className="size-4"
                          strokeWidth={2.25}
                        />
                        <span className="sr-only">Verified account</span>
                      </span>
                    )}
                  </div>
                  {t.href ? (
                    <a
                      href={t.href}
                      aria-label={`${t.name} (@${t.handle})`}
                      className={cn(
                        "inline-block max-w-full truncate rounded text-xs text-white/50",
                        "outline-none transition-colors hover:text-white/70 hover:underline",
                        "focus-visible:ring-2 focus-visible:ring-[color:var(--pb-tg-ring)]",
                        "focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--pb-tg-ink)]"
                      )}
                    >
                      @{t.handle}
                    </a>
                  ) : (
                    <span className="block truncate text-xs text-white/50">
                      @{t.handle}
                    </span>
                  )}
                </div>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-white/75">
                {t.body}
              </p>

              {t.media != null && t.media !== "" && (
                <div
                  aria-hidden
                  className={cn(
                    "relative mt-3 aspect-[16/10] overflow-hidden rounded-xl",
                    "bg-gradient-to-br from-white/[0.06] to-white/[0.02] ring-1 ring-white/10"
                  )}
                >
                  {typeof t.media === "string" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.media}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full">{t.media}</div>
                  )}
                  <span
                    className={cn(
                      "pointer-events-none absolute inset-y-0 left-0 w-1/2",
                      "bg-gradient-to-r from-transparent via-white/15 to-transparent",
                      "motion-reduce:hidden"
                    )}
                    style={{
                      transform: "translateX(-160%) skewX(-12deg)",
                      animation: "pb-tweet-grid-sheen 3.4s ease-in-out infinite",
                      animationDelay: `${sheenDelay}s`,
                    }}
                  />
                </div>
              )}

              {likes != null && (
                <div className="mt-4 flex items-center gap-1.5 border-t border-white/5 pt-3 text-white/45">
                  <Heart
                    aria-hidden
                    className="size-3.5 text-[color:var(--pb-tg-like)]"
                    strokeWidth={2.25}
                    fill="currentColor"
                  />
                  <span
                    className="text-xs tabular-nums"
                    aria-label={`${withCommas(likes)} likes`}
                  >
                    {formatCount(likes)}
                  </span>
                </div>
              )}
            </motion.div>
          </li>
        );
      })}
    </ul>
  );
}

export default TweetGrid;
