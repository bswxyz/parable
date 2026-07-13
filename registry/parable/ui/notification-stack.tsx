"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
  type Transition,
} from "motion/react";
import { Bell, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** One notification in the pile. `id` must be stable — it keys the animations. */
export interface NotificationItem {
  /** Stable identity. Drives enter/exit + the promotion of the next card. */
  id: string;
  /** Primary line, shown bold on the first row. */
  title: React.ReactNode;
  /** Optional supporting line under the title. */
  body?: React.ReactNode;
  /** Optional leading glyph. Defaults to a bell. */
  icon?: React.ReactNode;
}

export interface NotificationStackProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    | "children"
    | "onDrag"
    | "onDragStart"
    | "onDragEnd"
    | "onAnimationStart"
    | "onAnimationEnd"
    | "onAnimationIteration"
  > {
  /** The pile, newest first. Fully controlled — render whatever you keep in state. */
  items: NotificationItem[];
  /** Fires with the dismissed `id` (tap the ✕, or swipe the card sideways). */
  onDismiss?: (id: string) => void;
  /** How many cards peek in the collapsed stack before the rest are hidden. */
  collapsedCount?: number;
  /** Accent for the icon tint, count pill, and focus ring. Mirrors `--pb-violet`. */
  accent?: string;
}

/** Round a float before it reaches inline style, so SSR and client agree. */
const r = (n: number) => Math.round(n * 1000) / 1000;

const OFFSET = 12; // px each card sinks behind the one in front
const SCALE_STEP = 0.055; // scale falloff per depth level
const OPACITY_STEP = 0.16; // dim per depth level
const GAP = 12; // px between cards once expanded
const SWIPE_DISMISS = 96; // px of travel that commits a swipe-dismiss
const SWIPE_VELOCITY = 520; // px/s that commits a fast flick

const SPRING: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 24,
  mass: 0.9,
};
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** The icon + text block, shared by every render path. */
function Body({ item, accent }: { item: NotificationItem; accent: string }) {
  return (
    <>
      <span
        aria-hidden
        className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--pb-ns-accent)]/15 text-[var(--pb-ns-accent)] ring-1 ring-inset ring-[var(--pb-ns-accent)]/25 [&_svg]:size-[18px]"
        style={{ "--pb-ns-accent": accent } as React.CSSProperties}
      >
        {item.icon ?? <Bell strokeWidth={2.25} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">
          {item.title}
        </span>
        {item.body != null && item.body !== "" && (
          <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-white/60">
            {item.body}
          </span>
        )}
      </span>
    </>
  );
}

/**
 * NotificationStack — an iOS-lockscreen notification pile. Cards stack behind
 * the top one with a slight y-offset and scale falloff; new items spring in
 * from the top and dismissed ones swipe/fade out via `AnimatePresence`. Tapping
 * (or pressing Enter on) the top card fans the stack into a full scrollable
 * list and collapses it again — the reflow FLIP-animates so a dismissed top
 * card promotes the next one into place. Fully controlled: pass `items`, get an
 * `id` back from `onDismiss`, keep the array in your own state.
 *
 * Cards are swipe-dismissable by pointer and ✕-dismissable by keyboard, with a
 * real `role="list"` / `role="listitem"` tree and `aria-expanded` on the
 * toggle. Under `prefers-reduced-motion` it degrades to a plain static list —
 * no stack transforms, no drag, no springs — with every item legible at once.
 *
 * Colours mirror the site's `--pb-*` tokens (accent = violet #8b5cf6, over ink
 * #0f0f10; siblings fuchsia #ec4899 / ember #f5a623 / signal cyan #22d3ee).
 *
 * @parable/notification-stack
 */
export function NotificationStack({
  items,
  onDismiss,
  collapsedCount = 3,
  accent = "#8b5cf6",
  className,
  style,
  ...props
}: NotificationStackProps) {
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = React.useState(false);

  const dismiss = React.useCallback(
    (id: string) => onDismiss?.(id),
    [onDismiss]
  );

  const rootStyle = {
    "--pb-ns-accent": accent,
    ...style,
  } as React.CSSProperties;

  const cardChrome =
    "flex select-none items-start gap-2.5 rounded-2xl border border-white/10 bg-[#151517]/95 p-3 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)] backdrop-blur-md";
  const dismissBtn =
    "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-white/45 outline-none transition-colors hover:bg-white/10 hover:text-white/80 focus-visible:ring-2 focus-visible:ring-[var(--pb-ns-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f10]";

  // Reduced motion: a plain, static list. No stacking, drag, or springs.
  if (reduce) {
    return (
      <div
        role="list"
        aria-label="Notifications"
        className={cn("flex flex-col gap-2", className)}
        style={rootStyle}
        {...props}
      >
        {items.map((item) => (
          <div role="listitem" key={item.id} className={cardChrome}>
            <Body item={item} accent={accent} />
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(item.id)}
              className={dismissBtn}
            >
              <X className="size-4" strokeWidth={2.5} />
            </button>
          </div>
        ))}
      </div>
    );
  }

  const collapsible = items.length > 1;
  const visible = expanded ? items : items.slice(0, Math.max(1, collapsedCount));
  const peekCount = Math.max(0, Math.min(items.length, collapsedCount) - 1);
  const reserve = !expanded && peekCount > 0 ? peekCount * OFFSET + 6 : 0;

  return (
    <motion.div
      role="list"
      aria-label="Notifications"
      className={cn("relative", className)}
      style={rootStyle}
      animate={{ paddingBottom: reserve }}
      transition={SPRING}
      {...props}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {visible.map((item, i) => {
          const isTop = i === 0;
          const interactive = expanded || isTop;
          const depth = expanded ? 0 : i;

          const layoutStyle: React.CSSProperties =
            !expanded && !isTop
              ? { position: "absolute", top: depth * OFFSET, left: 0, right: 0 }
              : { position: "relative", marginTop: i === 0 ? 0 : GAP };

          return (
            <motion.div
              role="listitem"
              key={item.id}
              layout
              aria-hidden={!interactive || undefined}
              drag={interactive ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.85}
              dragSnapToOrigin
              onDragEnd={(_, info: PanInfo) => {
                if (
                  Math.abs(info.offset.x) > SWIPE_DISMISS ||
                  Math.abs(info.velocity.x) > SWIPE_VELOCITY
                ) {
                  dismiss(item.id);
                }
              }}
              initial={{ opacity: 0, y: -18, scale: 0.96 }}
              animate={{
                opacity: r(Math.max(0, 1 - depth * OPACITY_STEP)),
                scale: r(1 - depth * SCALE_STEP),
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
                transition: { duration: 0.18, ease: EASE_OUT },
              }}
              transition={SPRING}
              whileDrag={{ cursor: "grabbing" }}
              className={cn(cardChrome, interactive && "cursor-grab")}
              style={{
                ...layoutStyle,
                zIndex: items.length - depth,
                transformOrigin: "top center",
                touchAction: interactive ? "pan-y" : undefined,
                pointerEvents: interactive ? undefined : "none",
              }}
            >
              {isTop && collapsible ? (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  aria-expanded={expanded}
                  className="-m-1 flex min-w-0 flex-1 items-start gap-2.5 rounded-xl p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--pb-ns-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f10]"
                >
                  <Body item={item} accent={accent} />
                </button>
              ) : (
                <span className="flex min-w-0 flex-1 items-start gap-2.5">
                  <Body item={item} accent={accent} />
                </span>
              )}

              {isTop && collapsible && !expanded && (
                <span
                  aria-hidden
                  className="mt-0.5 grid h-7 min-w-7 shrink-0 place-items-center rounded-full bg-[var(--pb-ns-accent)]/15 px-1.5 text-xs font-semibold text-[var(--pb-ns-accent)]"
                >
                  {items.length}
                </span>
              )}

              {interactive && (
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => dismiss(item.id)}
                  className={dismissBtn}
                >
                  <X className="size-4" strokeWidth={2.5} />
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}

export default NotificationStack;
