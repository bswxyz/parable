"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Fine, deterministic threshold ladder for the scroll-spy observer. Static and
 * random-free so the module is SSR-safe and the observer reports coverage
 * changes smoothly as tall and short sections scroll through the fold.
 */
const THRESHOLDS = Array.from({ length: 21 }, (_, i) => i / 20);

/**
 * Inject a `<style>` sheet once per unique `id`. Shared across every instance,
 * SSR-guarded, and never torn down — the rules are cheap and idempotent, so a
 * mount/unmount churn can't drop keyframes another live rail still animates.
 */
function useInjectedKeyframes(id: string, css: string): void {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/** A single navigable section: a DOM id to spy on and its rail label. */
export interface SectionDotItem {
  /** `id` of the section element in the page this dot maps to. */
  id: string;
  /** Human label revealed in the pill when the dot is active or hovered. */
  label: string;
}

export interface SectionDotsProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** Ordered sections to track. One dot is rendered per entry, in order. */
  sections: SectionDotItem[];
  /** Which screen edge the rail pins to. Defaults to `"right"`. */
  position?: "right" | "left";
  /**
   * Pixels from the viewport top treated as the fold — subtracted from scroll
   * targets and from the observer's top margin so a fixed header never hides
   * the section a click lands on. Defaults to `0`.
   */
  offset?: number;
  /** Accent for the active dot, pill ring, and focus ring. Mirrors `--pb-violet`. */
  accent?: string;
}

/**
 * SectionDots — a scroll-spy side rail. One dot per section pins to a screen
 * edge; the dot for the section currently under the fold stretches into a pill
 * and its label springs out from behind the marker. Clicking a dot smooth-scrolls
 * to its section (honouring `offset` for a fixed header), and the active section
 * is tracked with an IntersectionObserver that picks whichever section covers
 * the most viewport — so tall and short sections read correctly. Hovering or
 * focusing any dot previews its label the same way.
 *
 * The rail is a real `<nav aria-label="Sections">` of `<button>`s carrying
 * `aria-current="location"`; each button keeps a stable `aria-label`, so a
 * screen reader always announces the destination even while the visible label
 * animates. Arrow / Home / End keys roam focus along the rail. Under
 * `prefers-reduced-motion` the pill appears with no stretch, the active-dot
 * pulse is dropped, and jumps use instant (`auto`) scrolling. A missing section
 * id is skipped gracefully: its dot never activates and its click is a no-op.
 *
 * Colours default to the site's `--pb-*` tokens (accent = violet #8b5cf6 on
 * ink #0f0f10; the palette also spans fuchsia #ec4899, ember #f5a623, and
 * signal #22d3ee).
 *
 * @parable/section-dots
 */
export function SectionDots({
  sections,
  position = "right",
  offset = 0,
  accent = "#8b5cf6",
  className,
  style,
  ...props
}: SectionDotsProps) {
  const reduce = useReducedMotion();

  useInjectedKeyframes(
    "pb-section-dots-kf",
    "@keyframes pb-section-dots-pulse{" +
      "0%,100%{transform:scale(1);opacity:.5}" +
      "50%{transform:scale(2.2);opacity:0}}"
  );

  const [activeId, setActiveId] = React.useState<string | null>(
    () => sections[0]?.id ?? null
  );
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  // Latest sections read inside the observer without re-subscribing on every
  // new array identity; the effect keys off the id list + offset instead.
  const sectionsRef = React.useRef(sections);
  sectionsRef.current = sections;
  const sectionKey = sections.map((s) => s.id).join("|");

  const btnRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  // Scroll-spy: observe every present section and mark active the one whose
  // visible slice covers the most of the viewport.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const coverage = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).id;
          const rb = e.rootBounds;
          const c =
            rb && rb.height
              ? e.intersectionRect.height / rb.height
              : e.intersectionRatio;
          coverage.set(id, e.isIntersecting ? c : 0);
        }
        let best: string | null = null;
        let bestVal = 0;
        for (const s of sectionsRef.current) {
          const v = coverage.get(s.id) ?? 0;
          if (v > bestVal + 1e-4) {
            bestVal = v;
            best = s.id;
          }
        }
        if (best && bestVal > 0) setActiveId(best);
      },
      {
        rootMargin: `${-offset}px 0px 0px 0px`,
        threshold: THRESHOLDS,
      }
    );

    for (const s of sectionsRef.current) {
      const el = document.getElementById(s.id);
      if (!el) continue; // guard: skip a missing section gracefully
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sectionKey, offset]);

  const scrollToId = React.useCallback(
    (id: string) => {
      const el =
        typeof document === "undefined" ? null : document.getElementById(id);
      if (!el) return; // guard: no-op when the section is absent
      const top = window.scrollY + el.getBoundingClientRect().top - offset;
      window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
      setActiveId(id);
    },
    [offset, reduce]
  );

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const last = sections.length - 1;
    let next = index;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = index + 1;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    next = Math.min(last, Math.max(0, next));
    btnRefs.current[next]?.focus();
  };

  const labelSpring: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 260, damping: 24, mass: 0.7 };
  const isRight = position === "right";
  const slideFrom = isRight ? 6 : -6;

  return (
    <nav
      aria-label="Sections"
      style={{ ["--pb-sd-accent" as string]: accent, ...style }}
      className={cn(
        "fixed top-1/2 z-40 -translate-y-1/2",
        isRight ? "right-5" : "left-5",
        className
      )}
      {...props}
    >
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {sections.map((s, i) => {
          const isActive = s.id === activeId;
          const expanded = isActive || s.id === hoveredId;
          return (
            <li key={s.id} className={cn("flex", isRight && "justify-end")}>
              <button
                ref={(el) => {
                  btnRefs.current[i] = el;
                }}
                type="button"
                aria-label={s.label}
                aria-current={isActive ? "location" : undefined}
                data-active={isActive}
                onClick={() => scrollToId(s.id)}
                onMouseEnter={() => setHoveredId(s.id)}
                onMouseLeave={() =>
                  setHoveredId((cur) => (cur === s.id ? null : cur))
                }
                onFocus={() => setHoveredId(s.id)}
                onBlur={() =>
                  setHoveredId((cur) => (cur === s.id ? null : cur))
                }
                onKeyDown={(e) => onKeyDown(e, i)}
                className={cn(
                  "group relative flex cursor-pointer items-center gap-2 rounded-full p-1.5",
                  "outline-none transition-colors duration-200",
                  isRight ? "flex-row-reverse" : "flex-row",
                  expanded
                    ? "bg-[#0f0f10]/70 shadow-[0_6px_24px_-10px_rgba(0,0,0,0.7)] ring-1 backdrop-blur-md"
                    : "ring-0",
                  isActive
                    ? "ring-[var(--pb-sd-accent)]/45"
                    : "ring-white/10",
                  "focus-visible:ring-2 focus-visible:ring-[var(--pb-sd-accent)]",
                  "focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f10]"
                )}
              >
                <span
                  aria-hidden
                  className="relative flex size-2.5 shrink-0 items-center justify-center"
                >
                  {isActive && !reduce && (
                    <span
                      className="absolute inset-0 rounded-full bg-[var(--pb-sd-accent)]"
                      style={{
                        animation:
                          "pb-section-dots-pulse 2.4s ease-in-out infinite",
                      }}
                    />
                  )}
                  <span
                    className={cn(
                      "relative size-2.5 rounded-full transition-[background-color,transform] duration-200",
                      isActive
                        ? "scale-110 bg-[var(--pb-sd-accent)]"
                        : expanded
                          ? "bg-white/70"
                          : "bg-white/30 group-hover:bg-white/55"
                    )}
                  />
                </span>

                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.span
                      key="label"
                      aria-hidden
                      initial={
                        reduce
                          ? false
                          : { width: 0, opacity: 0, x: slideFrom }
                      }
                      animate={{ width: "auto", opacity: 1, x: 0 }}
                      exit={
                        reduce
                          ? { opacity: 0 }
                          : { width: 0, opacity: 0, x: slideFrom }
                      }
                      transition={labelSpring}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      <span
                        className={cn(
                          "block text-xs font-medium leading-none text-white/90",
                          isRight ? "pl-1 pr-0.5" : "pl-0.5 pr-1"
                        )}
                      >
                        {s.label}
                      </span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default SectionDots;
