"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

const KEYFRAMES_ID = "pb-activity-feed-kf";
const KEYFRAMES = `
@keyframes pb-activity-feed-pulse {
  0%   { transform: scale(0.8); opacity: 0.5; }
  70%  { transform: scale(2.4); opacity: 0; }
  100% { transform: scale(2.4); opacity: 0; }
}
.pb-activity-feed__pulse {
  animation: pb-activity-feed-pulse 2.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}
@media (prefers-reduced-motion: reduce) {
  .pb-activity-feed__pulse { animation: none; opacity: 0; }
}
`;

/**
 * Append a keyframes <style> to <head> exactly once per document, keyed by id.
 * Shared across every instance and left in place on unmount, so the CSS is only
 * ever paid for once. Guarded for SSR (no document during server render).
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

/** Rotating brand hues used when an event omits its own accent. */
const ACCENTS = ["#8b5cf6", "#ec4899", "#22d3ee", "#f5a623"] as const;

export interface ActivityFeedEvent {
  /** Stable, unique React key for the row. */
  id: string;
  /** Marker glyph rendered on the rail. Decorative — always aria-hidden. */
  icon?: React.ReactNode;
  /** Who performed the action (rendered bold, opens the sentence). */
  actor: string;
  /** What happened. Wrap the target in `<strong>` to highlight it. */
  action: React.ReactNode;
  /** Relative timestamp label, e.g. `"2h ago"`. */
  time: string;
  /** Marker accent as a 6-digit hex. Defaults to a rotating brand hue; mirrors the `--pb-*` tokens. */
  accent?: string;
  /** Optional secondary content shown in a panel beneath the line. */
  detail?: React.ReactNode;
}

export interface ActivityFeedProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** Ordered events, newest first — the first row gets the live pulse. */
  events: ActivityFeedEvent[];
  /** Optional heading rendered above the feed and used as its accessible label. */
  title?: React.ReactNode;
}

/**
 * ActivityFeed — a vertical activity / timeline feed. Each event is a marker on
 * a gradient rail (violet → fuchsia → signal, mask-faded at both ends) followed
 * by an actor, an action with a highlighted target, a relative timestamp, and
 * optional secondary detail. Rows stagger-fade in on mount and the rail draws
 * itself downward — both kicked off from an effect so the first client render
 * matches the server (no hydration drift). The newest row carries a soft live
 * pulse. Rendered as a semantic `<ol>` of `<li>` rows, each of which reads as a
 * single sentence to a screen reader; every marker is aria-hidden.
 *
 * Under `prefers-reduced-motion` there is no stagger, no rail draw, and no
 * pulse — the feed paints once, fully legible, in its final state. Accent
 * defaults rotate through the site's `--pb-*` tokens (violet #8b5cf6, fuchsia
 * #ec4899, signal #22d3ee, ember #f5a623) on ink #0f0f10.
 *
 * @parable/activity-feed
 */
export function ActivityFeed({
  events,
  title,
  className,
  ...props
}: ActivityFeedProps) {
  const reduce = useReducedMotion();
  useInjectedKeyframes(KEYFRAMES_ID, KEYFRAMES);

  // Animations begin from an effect so the first client render === server render.
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => setShown(true), []);

  const headingId = React.useId();

  const listVariants: Variants = {
    hidden: {},
    show: {
      transition: reduce
        ? { duration: 0 }
        : { staggerChildren: 0.07, delayChildren: 0.05 },
    },
  };

  const rowVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduce
        ? { duration: 0 }
        : { type: "spring", stiffness: 220, damping: 24 },
    },
  };

  return (
    <section
      className={cn("text-white", className)}
      aria-labelledby={title ? headingId : undefined}
      {...props}
    >
      {title && (
        <h3
          id={headingId}
          className="mb-4 text-sm font-semibold tracking-tight text-white/90"
        >
          {title}
        </h3>
      )}

      <div className="relative">
        {/* Gradient rail, drawn top-down; sits behind the markers. */}
        <motion.span
          aria-hidden
          initial={{ scaleY: 0 }}
          animate={{ scaleY: shown ? 1 : 0 }}
          transition={
            reduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 120, damping: 26 }
          }
          className="pointer-events-none absolute bottom-2 left-4 top-2 w-px -translate-x-1/2"
          style={{
            transformOrigin: "top",
            backgroundImage:
              "linear-gradient(180deg, rgba(139,92,246,0.55), rgba(236,72,153,0.45), rgba(34,211,238,0.55))",
            WebkitMaskImage:
              "linear-gradient(180deg, transparent, #000 9%, #000 91%, transparent)",
            maskImage:
              "linear-gradient(180deg, transparent, #000 9%, #000 91%, transparent)",
          }}
        />

        <motion.ol
          variants={listVariants}
          initial="hidden"
          animate={shown ? "show" : "hidden"}
          className="relative space-y-0"
        >
          {events.map((ev, i) => {
            const accent = ev.accent ?? ACCENTS[i % ACCENTS.length];
            const isNewest = i === 0;
            return (
              <motion.li
                key={ev.id}
                variants={rowVariants}
                className="relative flex gap-4 pb-6 last:pb-0"
              >
                {/* Marker on the rail. */}
                <span className="relative z-10 flex size-8 shrink-0 items-center justify-center">
                  {isNewest && (
                    <span
                      aria-hidden
                      className="pb-activity-feed__pulse pointer-events-none absolute inset-0 rounded-full"
                      style={{ background: accent }}
                    />
                  )}
                  <span
                    aria-hidden
                    className="relative grid size-8 place-items-center rounded-full [&_svg]:size-4"
                    style={
                      {
                        background: `${accent}1f`,
                        color: accent,
                        boxShadow: `inset 0 0 0 1px ${accent}59, 0 0 14px -3px ${accent}80`,
                      } as React.CSSProperties
                    }
                  >
                    {ev.icon ?? (
                      <span
                        className="size-1.5 rounded-full"
                        style={{ background: accent }}
                      />
                    )}
                  </span>
                </span>

                {/* Row content — reads as one sentence for assistive tech. */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed text-white/65">
                    <span className="font-semibold text-white">
                      {ev.actor}
                    </span>{" "}
                    {ev.action}
                  </p>
                  <span className="mt-0.5 block text-xs font-medium tabular-nums text-white/40">
                    {ev.time}
                  </span>
                  {ev.detail != null && (
                    <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed text-white/60">
                      {ev.detail}
                    </div>
                  )}
                </div>
              </motion.li>
            );
          })}
        </motion.ol>
      </div>
    </section>
  );
}

export default ActivityFeed;
