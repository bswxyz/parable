"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FaqItem {
  /** The question shown on the always-visible row. */
  question: React.ReactNode;
  /** The answer revealed when the row expands. Any node — text, lists, links. */
  answer: React.ReactNode;
}

export interface FaqAccordionProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** The question/answer pairs, rendered top to bottom. */
  items: FaqItem[];
  /** Optional section heading rendered as an `<h2>` above the list. */
  title?: React.ReactNode;
  /**
   * `"single"` (default) keeps at most one row open — opening one closes the
   * rest. `"multiple"` lets any number stay open at once.
   */
  type?: "single" | "multiple";
  /** Index of the row open on first paint. Out-of-range values open nothing. */
  defaultOpenIndex?: number;
  /** Accent for the toggle icon and focus ring. Mirrors the site `--pb-violet` token. */
  accent?: string;
}

/**
 * FaqAccordion — an FAQ section whose question rows spring-expand to reveal
 * their answers: the panel height morphs open while the content fades and
 * lifts into place, and a plus icon rotates 45° into an ×. In `"single"` mode
 * (the default) opening one row collapses the others; `"multiple"` lets several
 * stay open. Every row is a real `<button>` carrying `aria-expanded` and
 * `aria-controls`, each answer is a labelled `role="region"`, and the header
 * group is a roving keyboard surface — Up/Down step between questions, Home/End
 * jump to the ends. Under `prefers-reduced-motion` panels open and close
 * instantly with no drift, leaving a fully legible static layout.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (accent = violet #8b5cf6;
 * surfaces read against ink #0f0f10, with fuchsia #ec4899, ember #f5a623, and
 * signal #22d3ee available as sibling accents).
 *
 * @parable/faq-accordion
 */
export function FaqAccordion({
  items,
  title,
  type = "single",
  defaultOpenIndex,
  accent = "#8b5cf6",
  className,
  style,
  ...props
}: FaqAccordionProps) {
  const reduce = useReducedMotion() ?? false;

  const [open, setOpen] = React.useState<Set<number>>(() => {
    const initial = new Set<number>();
    if (
      defaultOpenIndex !== undefined &&
      defaultOpenIndex >= 0 &&
      defaultOpenIndex < items.length
    ) {
      initial.add(defaultOpenIndex);
    }
    return initial;
  });

  const toggle = React.useCallback(
    (index: number) => {
      setOpen((prev) => {
        // "single" collapses siblings; "multiple" preserves them.
        const next = new Set<number>(type === "multiple" ? prev : []);
        if (prev.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
    },
    [type]
  );

  const reactId = React.useId();
  const headingId = `pb-faq-heading-${reactId}`;
  const buttonId = (i: number) => `pb-faq-btn-${reactId}-${i}`;
  const panelId = (i: number) => `pb-faq-panel-${reactId}-${i}`;

  // Roving focus across the question buttons — no wrap; Home/End jump the ends.
  const btnRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = items.length - 1;
    let target = -1;
    switch (e.key) {
      case "ArrowDown":
        target = Math.min(i + 1, last);
        break;
      case "ArrowUp":
        target = Math.max(i - 1, 0);
        break;
      case "Home":
        target = 0;
        break;
      case "End":
        target = last;
        break;
      default:
        return;
    }
    e.preventDefault();
    btnRefs.current[target]?.focus();
  };

  const heightTransition: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 220, damping: 26, mass: 0.9 };

  const contentTransition: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 240, damping: 26, delay: 0.04 };

  const iconTransition: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 260, damping: 20 };

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={cn("w-full text-white", className)}
      style={{ "--pb-faq-accent": accent, ...style } as React.CSSProperties}
      {...props}
    >
      {title && (
        <h2
          id={headingId}
          className="mb-8 text-balance text-2xl font-semibold tracking-tight text-white sm:text-3xl"
        >
          {title}
        </h2>
      )}

      <div className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-sm">
        {items.map((item, i) => {
          const isOpen = open.has(i);
          return (
            <div key={i} data-open={isOpen} className="group/faq">
              <h3 className="m-0">
                <button
                  ref={(el) => {
                    btnRefs.current[i] = el;
                  }}
                  type="button"
                  id={buttonId(i)}
                  aria-expanded={isOpen}
                  aria-controls={panelId(i)}
                  onClick={() => toggle(i)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 px-5 py-4 text-left",
                    "cursor-pointer outline-none transition-colors duration-200",
                    "hover:bg-white/[0.03]",
                    "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pb-faq-accent)]"
                  )}
                >
                  <span className="text-[0.9375rem] font-medium text-white">
                    {item.question}
                  </span>
                  <motion.span
                    aria-hidden
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={iconTransition}
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-lg",
                      "text-[var(--pb-faq-accent)] transition-colors",
                      "group-hover/faq:bg-[var(--pb-faq-accent)]/10"
                    )}
                  >
                    <Plus className="size-5" strokeWidth={2.25} />
                  </motion.span>
                </button>
              </h3>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="panel"
                    id={panelId(i)}
                    role="region"
                    aria-labelledby={buttonId(i)}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={heightTransition}
                    style={{ overflow: "hidden" }}
                  >
                    <motion.div
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? undefined : { opacity: 0, y: 4 }}
                      transition={contentTransition}
                      className="px-5 pb-5 pt-0 text-sm leading-relaxed text-white/65"
                    >
                      {item.answer}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default FaqAccordion;
