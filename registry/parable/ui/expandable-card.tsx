"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Controlled/uncontrolled state helper with a stable setter. */
function useControllableState(
  controlled: boolean | undefined,
  defaultValue: boolean,
  onChange?: (value: boolean) => void
) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : uncontrolled;
  const setValue = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolled(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );
  return [value, setValue] as const;
}

export interface ExpandableCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Primary heading shown in the collapsed row. */
  title: React.ReactNode;
  /** Optional secondary line under the title. */
  subtitle?: React.ReactNode;
  /** Decorative media — a left thumbnail or a full-width top strip. */
  media?: React.ReactNode;
  /** Where `media` renders. `"thumb"` = left of the title; `"strip"` = above it. */
  mediaLayout?: "thumb" | "strip";
  /** Accent used for the chevron and focus ring. Mirrors the site `--pb-violet` token. */
  accent?: string;
  /** Uncontrolled initial open state. */
  defaultExpanded?: boolean;
  /** Controlled open state. Pair with `onExpandedChange`. */
  expanded?: boolean;
  /** Fires with the next open state when the header is toggled. */
  onExpandedChange?: (expanded: boolean) => void;
  /** Expanded body content. Direct children fade/slide in with a slight stagger. */
  children: React.ReactNode;
}

/**
 * ExpandableCard — a card that spring-expands in place: the collapsed row shows
 * media / title / subtitle, and toggling reveals a body whose direct children
 * fade and slide in with a slight stagger while the height animates. Each card
 * is self-contained, so several can sit in a grid and expand independently
 * without disturbing their siblings. Works controlled or uncontrolled, is fully
 * keyboard operable (real button semantics, `aria-expanded`, `aria-controls`
 * pointing at the labelled body region), and collapses/expands instantly under
 * `prefers-reduced-motion`.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (accent = violet #8b5cf6).
 *
 * @parable/expandable-card
 */
export function ExpandableCard({
  title,
  subtitle,
  media,
  mediaLayout = "thumb",
  accent = "#8b5cf6",
  defaultExpanded = false,
  expanded: expandedProp,
  onExpandedChange,
  className,
  children,
  style,
  ...props
}: ExpandableCardProps) {
  const [expanded, setExpanded] = useControllableState(
    expandedProp,
    defaultExpanded,
    onExpandedChange
  );
  const reduce = useReducedMotion();

  const reactId = React.useId();
  const bodyId = `pb-ec-body-${reactId}`;
  const titleId = `pb-ec-title-${reactId}`;

  const heightTransition: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 220, damping: 26, mass: 0.9 };

  const listVariants: Variants = {
    collapsed: {},
    expanded: {
      transition: reduce
        ? { duration: 0 }
        : { staggerChildren: 0.05, delayChildren: 0.06 },
    },
  };

  const itemVariants: Variants = {
    collapsed: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
    expanded: {
      opacity: 1,
      y: 0,
      transition: reduce
        ? { duration: 0 }
        : { type: "spring", stiffness: 240, damping: 24 },
    },
  };

  const bodyItems = React.Children.toArray(children);

  return (
    <div
      data-expanded={expanded}
      style={{ "--pb-ec-accent": accent, ...style } as React.CSSProperties}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10",
        "bg-white/[0.02] text-white shadow-sm backdrop-blur-sm",
        "transition-colors duration-300",
        "data-[expanded=true]:border-[var(--pb-ec-accent)]/40",
        "data-[expanded=true]:bg-white/[0.035]",
        className
      )}
      {...props}
    >
      {media && mediaLayout === "strip" && (
        <div
          aria-hidden
          className="overflow-hidden [&_img]:block [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_svg]:size-8"
        >
          {media}
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={bodyId}
        className={cn(
          "flex w-full items-center gap-4 p-4 text-left",
          "cursor-pointer outline-none transition-colors duration-200",
          "hover:bg-white/[0.03]",
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pb-ec-accent)]"
        )}
      >
        {media && mediaLayout === "thumb" && (
          <span
            aria-hidden
            className={cn(
              "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl",
              "bg-white/5 ring-1 ring-white/10",
              "[&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_svg]:size-6"
            )}
          >
            {media}
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span
            id={titleId}
            className="block truncate text-sm font-semibold text-white"
          >
            {title}
          </span>
          {subtitle && (
            <span className="mt-0.5 block truncate text-xs text-white/55">
              {subtitle}
            </span>
          )}
        </span>

        <motion.span
          aria-hidden
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={
            reduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 260, damping: 20 }
          }
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg",
            "text-[var(--pb-ec-accent)] transition-colors",
            "group-hover:bg-[var(--pb-ec-accent)]/10"
          )}
        >
          <ChevronDown className="size-5" strokeWidth={2.25} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.section
            key="body"
            id={bodyId}
            role="region"
            aria-labelledby={titleId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={heightTransition}
            style={{ overflow: "hidden" }}
          >
            <motion.div
              variants={listVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              className="space-y-3 border-t border-white/10 px-4 pb-4 pt-4 text-sm leading-relaxed text-white/70"
            >
              {bodyItems.map((child, i) => (
                <motion.div key={i} variants={itemVariants}>
                  {child}
                </motion.div>
              ))}
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ExpandableCard;
