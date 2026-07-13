"use client";

import * as React from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

/** A single logo tile. `node` is a ReactNode so consumers pass `<img>` or SVGs. */
export interface LogoItem {
  /** The visual — an `<img>`, inline `<svg>`, or any element. */
  node: React.ReactNode;
  /** Accessible name announced for this logo (e.g. "Vercel"). */
  label: string;
}

export interface LogoCarouselProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** The logos to cycle through, distributed round-robin across columns. */
  logos: LogoItem[];
  /** Number of columns (tiles) shown in the wall. */
  columns?: number;
  /** Milliseconds between swaps. One column swaps per tick, so any given
   *  column re-swaps every `interval * columns` ms. */
  interval?: number;
}

/**
 * LogoCarousel — a wall of N columns; each column owns a share of the supplied
 * logos and flips through them with a vertical rotateX + y + opacity swap. A
 * single ticking clock advances exactly one column per `interval`, so the phase
 * is staggered and two tiles never swap at the same instant. Logos render
 * grayscale at 70% opacity and bloom to full colour on hover.
 *
 * Under `prefers-reduced-motion` it collapses to a static grid of the first N
 * logos with no cycling. Purely presentational; the component takes no colour
 * props, so there is nothing to theme against the site's `--pb-*` tokens.
 *
 * @parable/logo-carousel
 */
export function LogoCarousel({
  logos,
  columns = 4,
  interval = 2600,
  className,
  ...props
}: LogoCarouselProps) {
  const cols = Math.max(1, Math.floor(columns));
  const reduce = usePrefersReducedMotion();

  // Distribute logos round-robin so column c owns logos[c], logos[c+cols], …
  const buckets = React.useMemo(() => {
    const out: LogoItem[][] = Array.from({ length: cols }, () => []);
    logos.forEach((logo, i) => out[i % cols].push(logo));
    return out;
  }, [logos, cols]);

  const [indices, setIndices] = React.useState<number[]>(() =>
    Array.from({ length: cols }, () => 0)
  );

  // Keep the index array length in sync with the column count.
  React.useEffect(() => {
    setIndices((prev) => {
      if (prev.length === cols) return prev;
      return Array.from({ length: cols }, (_, i) => prev[i] ?? 0);
    });
  }, [cols]);

  // One shared clock. Each tick advances a single column, cycling which one, so
  // swaps cascade across the wall instead of firing simultaneously.
  React.useEffect(() => {
    if (reduce || cols === 0) return;
    let tick = 0;
    const id = window.setInterval(() => {
      const active = tick % cols;
      setIndices((prev) => {
        const len = buckets[active]?.length ?? 0;
        if (len <= 1) return prev; // nothing to swap to
        const next = prev.slice();
        next[active] = ((next[active] ?? 0) + 1) % len;
        return next;
      });
      tick += 1;
    }, Math.max(400, interval));
    return () => window.clearInterval(id);
  }, [reduce, cols, interval, buckets]);

  return (
    <div
      role="group"
      aria-label="Logos"
      className={cn(
        "grid w-full items-stretch gap-3 sm:gap-4",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      {...props}
    >
      {buckets.map((bucket, c) => {
        const idx = reduce ? 0 : (indices[c] ?? 0) % Math.max(1, bucket.length);
        const current = bucket[idx];
        return (
          <div
            key={c}
            role="img"
            aria-label={current?.label}
            className={cn(
              "relative flex h-20 items-center justify-center overflow-hidden rounded-xl",
              "border border-white/10 bg-white/[0.02] px-3",
              "opacity-70 grayscale transition-[filter,opacity] duration-500 ease-out",
              "hover:opacity-100 hover:grayscale-0",
              "focus-within:opacity-100 focus-within:grayscale-0",
              "[&_img]:max-h-10 [&_img]:w-auto [&_img]:object-contain"
            )}
            style={{ perspective: "700px" }}
          >
            {reduce ? (
              <div className="flex items-center justify-center">
                {current?.node}
              </div>
            ) : (
              <AnimatePresence initial={false}>
                <motion.div
                  key={`${c}-${idx}`}
                  aria-hidden
                  variants={swapVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="absolute inset-0 flex items-center justify-center"
                >
                  {current?.node}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        );
      })}
    </div>
  );
}

const swapVariants: Variants = {
  enter: { opacity: 0, y: "-46%", rotateX: 52 },
  center: {
    opacity: 1,
    y: "0%",
    rotateX: 0,
    transition: { type: "spring", stiffness: 240, damping: 24 },
  },
  exit: {
    opacity: 0,
    y: "46%",
    rotateX: -52,
    transition: { type: "spring", stiffness: 210, damping: 26 },
  },
};

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

export default LogoCarousel;
