"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { cn } from "@/lib/utils";

/** Inject a `<style>` with `id` exactly once, client-side, and never re-add it. */
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

const KF_ID = "pb-morph-tabs-kf";
/**
 * The active indicator carries a slow brand-gradient sheen. Both the keyframes
 * and the class that drives them live here, so the class name is inert until the
 * style is injected client-side — server HTML and first client render match, and
 * the CSS-level reduced-motion guard freezes the sheen even if JS never runs.
 */
const KEYFRAMES = `
@keyframes pb-morph-tabs-sheen {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
.pb-morph-tabs-sheen {
  animation: pb-morph-tabs-sheen 7s cubic-bezier(.22,1,.36,1) infinite alternate;
}
@media (prefers-reduced-motion: reduce) {
  .pb-morph-tabs-sheen { animation: none; }
}
`;

/**
 * Controlled/uncontrolled state helper with a stable setter. Generic so a value
 * of any shape works; here it tracks the selected tab's `value` string.
 */
function useControllableState<T>(
  controlled: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void
) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : uncontrolled;
  const setValue = React.useCallback(
    (next: T) => {
      if (!isControlled) setUncontrolled(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );
  return [value, setValue] as const;
}

export interface MorphTab {
  /** Stable identity for this tab. Selection is tracked by this value. */
  value: string;
  /** Trigger label. */
  label: React.ReactNode;
  /** Optional leading glyph rendered before the label. */
  icon?: React.ReactNode;
  /** Panel body revealed when this tab is active. */
  content: React.ReactNode;
}

export interface MorphTabsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue"> {
  /** Tabs to render, in visual order. */
  tabs: MorphTab[];
  /** Controlled selected value. Pair with `onValueChange`. */
  value?: string;
  /** Uncontrolled initial value. Defaults to the first tab. */
  defaultValue?: string;
  /** Fires with the next value whenever the selection changes. */
  onValueChange?: (value: string) => void;
  /** Indicator style: a gliding `pill` behind the label, or an `underline` bar. */
  variant?: "pill" | "underline";
}

/**
 * MorphTabs — animated WAI-ARIA tabs whose selection indicator is a single
 * shared element (`layoutId`) that springs between triggers as the active tab
 * changes: a soft glass pill in the `pill` variant, a gradient bar in the
 * `underline` variant. Panels cross-fade and slide in the travel direction —
 * forward selections enter from the right, backward from the left — via
 * `AnimatePresence`. The indicator carries a slow, decorative brand-gradient
 * sheen. Works controlled or uncontrolled with a full roving-tabindex keyboard
 * model (Left/Right arrows wrap, Home/End jump to the ends, selection follows
 * focus) and correct `tablist`/`tab`/`tabpanel` wiring with `aria-selected`,
 * `aria-controls`, and `aria-labelledby`. Under `prefers-reduced-motion` the
 * indicator jumps, panels swap instantly, and the sheen is frozen — all still
 * fully legible.
 *
 * Gradient defaults reference the site `--pb-*` tokens (violet #8b5cf6,
 * fuchsia #ec4899, signal #22d3ee) over ink #0f0f10, falling back to those hexes.
 *
 * @parable/morph-tabs
 */
export function MorphTabs({
  tabs,
  value: valueProp,
  defaultValue,
  onValueChange,
  variant = "pill",
  className,
  ...props
}: MorphTabsProps) {
  useInjectedKeyframes(KF_ID, KEYFRAMES);
  const reduce = useReducedMotion();

  const [value, setValue] = useControllableState(
    valueProp,
    defaultValue ?? tabs[0]?.value ?? "",
    onValueChange
  );

  const rawId = React.useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");
  const indicatorId = `pb-mt-ind-${uid}`;
  const tabId = (i: number) => `pb-mt-tab-${uid}-${i}`;
  const panelId = (i: number) => `pb-mt-panel-${uid}-${i}`;

  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const foundIndex = tabs.findIndex((t) => t.value === value);
  const activeIndex = foundIndex < 0 ? 0 : foundIndex;
  const activeTab = tabs[activeIndex];

  // Travel direction, derived from the previous active index so it is correct
  // whether the value changed via click, keyboard, or a controlled prop update.
  const prevIndexRef = React.useRef(activeIndex);
  const direction =
    activeIndex === prevIndexRef.current
      ? 0
      : activeIndex > prevIndexRef.current
      ? 1
      : -1;
  React.useEffect(() => {
    prevIndexRef.current = activeIndex;
  }, [activeIndex]);

  const selectByIndex = React.useCallback(
    (i: number) => {
      const t = tabs[i];
      if (t) setValue(t.value);
    },
    [tabs, setValue]
  );

  const onTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    i: number
  ) => {
    const n = tabs.length;
    if (n === 0) return;
    let next = -1;
    switch (e.key) {
      case "ArrowRight":
        next = (i + 1) % n;
        break;
      case "ArrowLeft":
        next = (i - 1 + n) % n;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = n - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    tabRefs.current[next]?.focus();
    selectByIndex(next);
  };

  const indicatorTransition: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 240, damping: 24, mass: 0.85 };

  const panelTransition: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 240, damping: 26, mass: 0.9 };

  const panelVariants: Variants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: reduce ? 0 : dir >= 0 ? 28 : -28,
    }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({
      opacity: 0,
      x: reduce ? 0 : dir >= 0 ? -28 : 28,
    }),
  };

  const gradient =
    "linear-gradient(120deg, var(--pb-violet, #8b5cf6), " +
    "var(--pb-fuchsia, #ec4899), var(--pb-signal, #22d3ee), " +
    "var(--pb-violet, #8b5cf6))";

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-[var(--pb-violet,#8b5cf6)] " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pb-ink,#0f0f10)]";

  const indicator =
    variant === "pill" ? (
      <motion.span
        layoutId={indicatorId}
        aria-hidden
        transition={indicatorTransition}
        className="pointer-events-none absolute inset-0 rounded-full"
      >
        <span className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-inset ring-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_10px_24px_-10px_rgba(139,92,246,0.55)]" />
        <span
          className="pb-morph-tabs-sheen absolute inset-0 rounded-full opacity-25"
          style={{ backgroundImage: gradient, backgroundSize: "200% 100%" }}
        />
      </motion.span>
    ) : (
      <motion.span
        layoutId={indicatorId}
        aria-hidden
        transition={indicatorTransition}
        className="pb-morph-tabs-sheen pointer-events-none absolute inset-x-0 -bottom-px h-0.5 rounded-full"
        style={{ backgroundImage: gradient, backgroundSize: "200% 100%" }}
      />
    );

  return (
    <div className={cn("text-white", className)} {...props}>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className={cn(
          "inline-flex max-w-full items-center overflow-x-auto",
          variant === "pill"
            ? "gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-inset ring-white/10"
            : "gap-1 border-b border-white/10"
        )}
      >
        {tabs.map((tab, i) => {
          const selected = i === activeIndex;
          return (
            <button
              key={tab.value}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={tabId(i)}
              aria-selected={selected}
              aria-controls={panelId(i)}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectByIndex(i)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
              className={cn(
                "relative inline-flex shrink-0 cursor-pointer select-none items-center whitespace-nowrap text-sm font-medium",
                "transition-colors duration-200",
                variant === "pill"
                  ? "rounded-full px-4 py-2"
                  : "rounded-md px-4 py-2.5",
                selected ? "text-white" : "text-white/55 hover:text-white/80",
                focusRing
              )}
            >
              {selected && indicator}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon && (
                  <span
                    aria-hidden
                    className="inline-flex [&_svg]:size-4 [&_svg]:shrink-0"
                  >
                    {tab.icon}
                  </span>
                )}
                <span>{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative mt-4 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          {activeTab && (
            <motion.div
              key={activeIndex}
              role="tabpanel"
              id={panelId(activeIndex)}
              aria-labelledby={tabId(activeIndex)}
              tabIndex={0}
              custom={direction}
              variants={panelVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={panelTransition}
              className={cn(
                "rounded-lg text-sm leading-relaxed text-white/75",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
                "focus-visible:ring-[var(--pb-violet,#8b5cf6)]"
              )}
            >
              {activeTab.content}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default MorphTabs;
