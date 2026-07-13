"use client";

import * as React from "react";
import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Brand accents cycled through when an item omits its own `accent`. These mirror
 * the site's `--pb-*` tokens: violet, fuchsia, ember, signal cyan.
 */
const PB_ACCENTS = ["#8b5cf6", "#ec4899", "#f5a623", "#22d3ee"] as const;

export interface StickyScrollItem {
  /** Card heading. */
  title: string;
  /** Supporting copy under the heading. */
  body: string;
  /** Accent hex for the index eyebrow and hairline. Falls back to the Parable palette. */
  accent?: string;
  /** Optional rich content rendered below the body (media, stats, buttons…). */
  content?: React.ReactNode;
}

export interface StickyScrollCardsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Ordered cards. Each sticks in turn while the next scrolls over it. */
  items: StickyScrollItem[];
  /** Extra classes merged onto every card face. */
  cardClassName?: string;
  /** Distance in px from the viewport top where each card pins. Defaults to 96. */
  stickyTop?: number;
}

interface StickyCardProps {
  item: StickyScrollItem;
  index: number;
  total: number;
  stickyTop: number;
  cardClassName?: string;
}

function StickyCard({
  item,
  index,
  total,
  stickyTop,
  cardClassName,
}: StickyCardProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Track this card's own travel past the viewport top: 0 when its top reaches
  // the fold, 1 once its bottom has — i.e. the window over which the next card
  // climbs up and covers it. No scroll hijack; this is plain page scroll.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // The final card has nothing stacking on top of it, so it never recedes.
  const covered = !reduce && index < total - 1;

  const scale = useTransform(scrollYProgress, [0, 0.6, 1], [1, 1, 0.94]);
  const blurPx = useTransform(scrollYProgress, [0, 0.6, 1], [0, 0, 5]);
  const dim = useTransform(scrollYProgress, [0, 0.6, 1], [0, 0, 0.6]);
  const filter = useMotionTemplate`blur(${blurPx}px)`;

  const accent = item.accent ?? PB_ACCENTS[index % PB_ACCENTS.length];
  const eyebrow = String(index + 1).padStart(2, "0");

  return (
    <div
      ref={ref}
      role="listitem"
      className="[&:not(:last-child)]:mb-6 sm:[&:not(:last-child)]:mb-8"
    >
      <motion.article
        style={{
          top: stickyTop,
          zIndex: index,
          transformOrigin: "center top",
          ...(covered ? { scale, filter } : null),
        }}
        className={cn(
          "sticky isolate overflow-hidden rounded-3xl p-6 sm:p-9",
          "border border-white/10 bg-[#141416] text-white",
          "shadow-[0_24px_70px_-32px_rgba(0,0,0,0.85)]",
          "focus-within:ring-2 focus-within:ring-[color:var(--pb-ssc-accent)]/60",
          cardClassName
        )}
      >
        <span
          style={{ ["--pb-ssc-accent" as string]: accent }}
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden
        >
          <span
            className="absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-25 blur-3xl"
            style={{
              background: `radial-gradient(circle, ${accent} 0%, transparent 70%)`,
            }}
          />
        </span>

        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="font-mono text-xs font-medium tracking-[0.25em]"
            style={{ color: accent }}
          >
            {eyebrow}
          </span>
          <span
            aria-hidden
            className="h-px flex-1"
            style={{
              background: `linear-gradient(90deg, ${accent}66, transparent)`,
            }}
          />
        </div>

        <h3 className="mt-5 text-xl font-semibold tracking-tight sm:text-2xl">
          {item.title}
        </h3>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-white/60 sm:text-base">
          {item.body}
        </p>

        {item.content != null && <div className="mt-6">{item.content}</div>}

        {covered && (
          <motion.span
            aria-hidden
            style={{ opacity: dim }}
            className="pointer-events-none absolute inset-0 rounded-[inherit] bg-black"
          />
        )}
      </motion.article>
    </div>
  );
}

/**
 * StickyScrollCards — a scroll-driven stack. Each card pins at `stickyTop` while
 * the following card scrolls up and over it; as a card is covered it scales down
 * to ~0.94, dims, and blurs a touch, so the pile appears to recede into depth.
 * Driven entirely by `motion`'s `useScroll`/`useTransform` per card against
 * ordinary page scroll — there is no scroll hijacking. Each card carries a mono
 * index eyebrow ("01", "02"…) tinted with its accent.
 *
 * Under `prefers-reduced-motion` the depth transforms are dropped: cards simply
 * stack in place, fully static and legible. Accent colours default to the
 * Parable palette (violet, fuchsia, ember, signal cyan) mirroring the site's
 * `--pb-*` tokens.
 *
 * @parable/sticky-scroll-cards
 */
export function StickyScrollCards({
  items,
  cardClassName,
  stickyTop = 96,
  className,
  ...props
}: StickyScrollCardsProps) {
  return (
    <div role="list" className={cn("relative", className)} {...props}>
      {items.map((item, index) => (
        <StickyCard
          key={index}
          item={item}
          index={index}
          total={items.length}
          stickyTop={stickyTop}
          cardClassName={cardClassName}
        />
      ))}
    </div>
  );
}

export default StickyScrollCards;
