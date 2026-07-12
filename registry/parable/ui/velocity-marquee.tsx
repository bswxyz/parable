"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface VelocityMarqueeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Items to scroll. Strings or nodes. */
  items: React.ReactNode[];
  /** Base pixels/second. */
  baseSpeed?: number;
  /** Scroll direction. */
  direction?: "left" | "right";
  /** Extra px/sec added at peak scroll velocity. */
  scrollBoost?: number;
  /** Gap between items, any CSS length. */
  gap?: string;
}

/**
 * VelocityMarquee — an infinite marquee that speeds up with the page's scroll
 * velocity and eases back to its base speed. rAF-driven, seamless (two tracks),
 * and frozen under prefers-reduced-motion.
 *
 * @parable/velocity-marquee
 */
export function VelocityMarquee({
  items,
  baseSpeed = 60,
  direction = "left",
  scrollBoost = 340,
  gap = "3rem",
  className,
  ...props
}: VelocityMarqueeProps) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const offset = React.useRef(0);
  const boost = React.useRef(0);
  const lastScroll = React.useRef(0);
  const lastT = React.useRef(0);
  const width = React.useRef(0);

  React.useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const measure = () => (width.current = track.scrollWidth / 2);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);

    const onScroll = () => {
      const y = window.scrollY;
      boost.current = Math.min(1, Math.abs(y - lastScroll.current) / 40);
      lastScroll.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    let raf = 0;
    const dir = direction === "left" ? -1 : 1;
    const tick = (t: number) => {
      const dt = lastT.current ? (t - lastT.current) / 1000 : 0;
      lastT.current = t;
      const speed = baseSpeed + boost.current * scrollBoost;
      boost.current *= 0.9; // decay back to base
      if (!reduce) offset.current += dir * speed * dt;
      const w = width.current || 1;
      offset.current = ((offset.current % w) + w) % w;
      track.style.transform = `translate3d(${
        dir < 0 ? -offset.current : offset.current - w
      }px,0,0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [baseSpeed, direction, scrollBoost]);

  const row = (key: string) =>
    items.map((it, i) => (
      <span
        key={`${key}-${i}`}
        className="shrink-0 whitespace-nowrap"
        style={{ marginInlineEnd: gap }}
      >
        {it}
      </span>
    ));

  return (
    <div
      className={cn("relative w-full overflow-hidden", className)}
      aria-label="Scrolling marquee"
      {...props}
    >
      <div ref={trackRef} className="flex w-max flex-nowrap will-change-transform">
        {row("a")}
        {row("b")}
      </div>
    </div>
  );
}

export default VelocityMarquee;
