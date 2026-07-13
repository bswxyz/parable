"use client";

import * as React from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function useInjectedKeyframes(id: string, css: string) {
  React.useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/** The three visual modes the island can morph between. */
export type DynamicIslandState = "idle" | "expanded" | "ring";

export interface DynamicIslandProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    | "onAnimationStart"
    | "onAnimationEnd"
    | "onAnimationIteration"
    | "onDrag"
    | "onDragStart"
    | "onDragEnd"
    | "children"
  > {
  /** Controlled state. Pair with `onStateChange`. */
  state?: DynamicIslandState;
  /** Initial state when uncontrolled. */
  defaultState?: DynamicIslandState;
  /** Fires on every state change (both controlled and uncontrolled). */
  onStateChange?: (state: DynamicIslandState) => void;
  /** Compact content shown in the `idle` pill. Falls back to a pulsing dot + `label`. */
  idleContent?: React.ReactNode;
  /** Label used by the default idle content when `idleContent` is not supplied. */
  label?: string;
  /** Accent colour for the idle dot and the ring stroke. Defaults to Parable violet (`--pb-violet`). */
  accent?: string;
  /** Pill face colour. Defaults to Parable ink `#0f0f10` (`--pb-ink`). */
  background?: string;
  /** Progress `0..1` for the `ring` state. */
  ringProgress?: number;
  /** Centre content for the `ring` state (e.g. a countdown or icon). */
  ringContent?: React.ReactNode;
  /** Collapse to `idle` when a pointer press lands outside the island while expanded. */
  collapseOnOutsideClick?: boolean;
  /** Expanded panel body — title, text, actions, anything. */
  children?: React.ReactNode;
}

/**
 * DynamicIsland — an iOS-style black pill that spring-morphs (Motion layout
 * animation, stiffness 260 / damping 26) between a compact `idle` pill, an
 * `expanded` card, and a circular `ring` state. Works controlled (`state` +
 * `onStateChange`) or uncontrolled (click a collapsed pill to expand).
 *
 * Collapsed, it is a `role="button"` (Enter/Space expand); expanded, it is a
 * `role="dialog"` that Escape, its close control, or an outside click collapses,
 * with focus handed to the panel on open and back to the pill on close. Under
 * `prefers-reduced-motion` the morph is skipped and states switch instantly.
 *
 * Colours default to the Parable palette (violet `#8b5cf6`, ink `#0f0f10`),
 * mirroring the site's `--pb-*` tokens.
 *
 * @parable/dynamic-island
 */
export function DynamicIsland({
  state: stateProp,
  defaultState = "idle",
  onStateChange,
  idleContent,
  label = "Live",
  accent = "#8b5cf6",
  background = "#0f0f10",
  ringProgress = 0.62,
  ringContent,
  collapseOnOutsideClick = true,
  className,
  children,
  style,
  onClick,
  onKeyDown,
  ...rest
}: DynamicIslandProps) {
  const reduce = useReducedMotion() ?? false;

  useInjectedKeyframes(
    "pb-dynamic-island-kf",
    "@keyframes pb-di-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.78)}}" +
      ".pb-di-dot{animation:pb-di-pulse 1.8s ease-in-out infinite}" +
      ".pb-di-ring-track{transition:stroke-dashoffset .6s cubic-bezier(.22,1,.36,1)}" +
      "@media (prefers-reduced-motion:reduce){.pb-di-dot{animation:none!important}.pb-di-ring-track{transition:none!important}}"
  );

  // Controlled / uncontrolled state.
  const isControlled = stateProp !== undefined;
  const [internal, setInternal] = React.useState<DynamicIslandState>(
    defaultState
  );
  const state = isControlled ? (stateProp as DynamicIslandState) : internal;
  const setState = React.useCallback(
    (next: DynamicIslandState) => {
      if (!isControlled) setInternal(next);
      onStateChange?.(next);
    },
    [isControlled, onStateChange]
  );

  const collapsed = state !== "expanded";

  const rootRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const expand = React.useCallback(() => setState("expanded"), [setState]);
  const collapse = React.useCallback(() => setState("idle"), [setState]);

  // Focus management: hand focus to the panel on open and back to the pill on
  // close — but only when focus already lived inside the island, so a parent
  // that flips `state` programmatically never yanks focus from elsewhere.
  const prevState = React.useRef<DynamicIslandState>(state);
  React.useEffect(() => {
    const prev = prevState.current;
    prevState.current = state;
    if (prev === state) return;
    const root = rootRef.current;
    if (!root || !root.contains(document.activeElement)) return;
    const target =
      state === "expanded" ? panelRef.current : prev === "expanded" ? root : null;
    if (target) {
      const id = requestAnimationFrame(() => target.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [state]);

  // Outside-press collapses the expanded panel.
  React.useEffect(() => {
    if (state !== "expanded" || !collapseOnOutsideClick) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        collapse();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [state, collapseOnOutsideClick, collapse]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(e);
    if (state !== "expanded") expand();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (state === "expanded") {
      if (e.key === "Escape") {
        e.preventDefault();
        collapse();
      }
      return;
    }
    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      expand();
    }
  };

  // Ring geometry.
  const p = Math.min(1, Math.max(0, ringProgress));
  const R = 15;
  const C = 2 * Math.PI * R;
  const ringOffset = C * (1 - p);

  const layoutTransition: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 260, damping: 26 };
  const contentTransition: Transition = reduce
    ? { duration: 0 }
    : { duration: 0.24, ease: [0.22, 1, 0.36, 1] };
  const contentInitial = reduce
    ? { opacity: 0 }
    : { opacity: 0, filter: "blur(8px)" };
  const contentAnimate = reduce
    ? { opacity: 1 }
    : { opacity: 1, filter: "blur(0px)" };
  const contentExit = reduce
    ? { opacity: 0 }
    : { opacity: 0, filter: "blur(8px)" };

  let content: React.ReactNode;
  if (state === "expanded") {
    content = (
      <div className="relative w-[min(84vw,360px)] p-4">
        <button
          type="button"
          aria-label="Collapse"
          onClick={collapse}
          className={cn(
            "absolute right-3 top-3 grid size-6 place-items-center rounded-full",
            "text-white/45 outline-none transition-colors",
            "hover:bg-white/10 hover:text-white/80",
            "focus-visible:ring-2 focus-visible:ring-white/60"
          )}
        >
          <X className="size-3.5" aria-hidden />
        </button>
        <div ref={panelRef} tabIndex={-1} className="outline-none">
          {children}
        </div>
      </div>
    );
  } else if (state === "ring") {
    content = (
      <div className="relative grid size-11 select-none place-items-center">
        <svg viewBox="0 0 44 44" className="size-9 -rotate-90" aria-hidden>
          <circle
            cx="22"
            cy="22"
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="3.5"
          />
          <circle
            className="pb-di-ring-track"
            cx="22"
            cy="22"
            r={R}
            fill="none"
            stroke={accent}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={ringOffset}
            style={{ filter: `drop-shadow(0 0 3px ${accent})` }}
          />
        </svg>
        {ringContent != null && (
          <span className="absolute inset-0 grid place-items-center text-[10px] font-semibold text-white/90">
            {ringContent}
          </span>
        )}
      </div>
    );
  } else {
    content = (
      <div className="flex h-11 select-none items-center gap-2.5 pl-3.5 pr-4">
        {idleContent ?? (
          <>
            <span
              aria-hidden
              className="pb-di-dot relative inline-block size-2.5 shrink-0 rounded-full"
              style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
            />
            <span className="whitespace-nowrap text-[13px] font-medium tracking-tight text-white/90">
              {label}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <motion.div
      ref={rootRef}
      aria-label="Dynamic Island"
      {...rest}
      role={collapsed ? "button" : "dialog"}
      aria-expanded={collapsed ? false : undefined}
      aria-modal={collapsed ? undefined : false}
      tabIndex={collapsed ? 0 : -1}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      layout={!reduce}
      transition={layoutTransition}
      whileTap={collapsed && !reduce ? { scale: 0.96 } : undefined}
      style={{
        background,
        borderRadius: state === "expanded" ? 28 : 9999,
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 0 rgba(255,255,255,0.06), 0 16px 50px -16px rgba(0,0,0,0.75)",
        ...style,
      }}
      className={cn(
        "relative inline-flex flex-col overflow-hidden text-white",
        collapsed && "cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55",
        className
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={state}
          initial={contentInitial}
          animate={contentAnimate}
          exit={contentExit}
          transition={contentTransition}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

export default DynamicIsland;
