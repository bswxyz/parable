"use client";

import * as React from "react";
import { motion, AnimatePresence, type Transition } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Inject a <style> block once per unique id (SSR-safe, idempotent). */
function useInjectedKeyframes(id: string, css: string) {
  React.useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/** Track prefers-reduced-motion reactively (defaults to false so the first
 *  client render matches the server, then reconciles from an effect). */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/**
 * Minimal controlled/uncontrolled boolean. Returns the resolved value and a
 * setter that updates internal state only when uncontrolled and always fires
 * the change callback — the standard "either/or" state pattern.
 */
function useControllableBoolean(
  controlled: boolean | undefined,
  defaultValue: boolean,
  onChange?: (v: boolean) => void
): [boolean, (v: boolean) => void] {
  const isControlled = controlled !== undefined;
  const [internal, setInternal] = React.useState(defaultValue);
  const value = isControlled ? controlled : internal;
  const set = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );
  return [value, set];
}

// Surface geometry. The compact radius is large enough to read as a pill at
// chip heights; the panel radius is a soft card corner. Motion interpolates
// between them as part of the layout animation.
const COMPACT_RADIUS = 999;
const PANEL_RADIUS = 22;

// Spring stays inside the house range (~170–260 stiffness / 14–26 damping).
const SURFACE_SPRING: Transition = {
  type: "spring",
  stiffness: 220,
  damping: 26,
  mass: 0.9,
};
const CONTENT_EASE: Transition = { duration: 0.22, ease: [0.22, 1, 0.36, 1] };

// Props we drop from the div passthrough because `motion.div` redefines them
// with animation-flavoured signatures (they would otherwise clash on spread).
type PassthroughDivProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  | "children"
  | "onAnimationStart"
  | "onAnimationEnd"
  | "onAnimationIteration"
  | "onDrag"
  | "onDragStart"
  | "onDragEnd"
  | "onDragEnter"
  | "onDragExit"
  | "onDragLeave"
  | "onDragOver"
  | "onDrop"
>;

export interface MorphSurfaceProps extends PassthroughDivProps {
  /** The collapsed "chip" content. Clicking it expands the surface. */
  compact: React.ReactNode;
  /** The rich "panel" content shown when expanded. */
  expandedContent: React.ReactNode;
  /** Controlled open state. Omit to let the component manage its own. */
  expanded?: boolean;
  /** Initial open state when uncontrolled. Defaults to `false`. */
  defaultExpanded?: boolean;
  /** Fires whenever the open state should change (both modes). */
  onExpandedChange?: (expanded: boolean) => void;
  /**
   * Accent for the focus ring and the expanded-panel sheen. Defaults to
   * Parable violet `#8b5cf6` (mirrors the site's `--pb-violet` token).
   */
  accent?: string;
  /** Accessible name for the expanded panel group. Defaults to "Details". */
  panelLabel?: string;
  /** Accessible label for the collapse control. Defaults to "Collapse". */
  closeLabel?: string;
}

/**
 * MorphSurface — one container that morphs in place between a compact "chip"
 * and a rich "panel". A single Motion layout element springs its size and
 * corner radius while `AnimatePresence` (mode `popLayout`) cross-fades the two
 * content states: the outgoing state is popped out of flow and fades as the
 * incoming state drives the new box, so the surface fluidly resizes to fit
 * rather than jump-cutting. The compact state is a full-bleed button
 * (`aria-expanded` + `aria-controls`); the panel carries a close affordance,
 * Escape-to-collapse, and focus that moves to the close control on open and
 * returns to the trigger on close (only for user-driven toggles, never when a
 * parent drives the controlled prop). State is controlled or uncontrolled via
 * the usual `expanded` / `defaultExpanded` / `onExpandedChange` trio.
 *
 * Under `prefers-reduced-motion` the surface swaps instantly — no size or
 * radius morph, no cross-fade, no sheen — while keeping every affordance and
 * focus move intact.
 *
 * SSR-safe: no `Math.random()`/`Date.now()` during render, deterministic
 * markup, and floats emitted into styles are integers. Colour defaults mirror
 * the site's `--pb-*` tokens (violet `#8b5cf6`, ink `#0f0f10`).
 *
 * @parable/morph-surface
 */
export function MorphSurface({
  compact,
  expandedContent,
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  accent = "#8b5cf6",
  panelLabel = "Details",
  closeLabel = "Collapse",
  className,
  style,
  ...rest
}: MorphSurfaceProps) {
  useInjectedKeyframes(
    "pb-morph-surface-kf",
    ".pb-ms-trigger,.pb-ms-close{outline:none}" +
      ".pb-ms-trigger:focus-visible,.pb-ms-close:focus-visible{box-shadow:inset 0 0 0 2px var(--pb-ms-accent,#8b5cf6)}" +
      ".pb-ms-sheen{background:linear-gradient(90deg,transparent,var(--pb-ms-accent,#8b5cf6),transparent);background-size:200% 100%;animation:pb-morph-surface-sheen 2.6s cubic-bezier(.22,1,.36,1) infinite}" +
      "@keyframes pb-morph-surface-sheen{to{background-position:-200% 50%}}" +
      "@media (prefers-reduced-motion:reduce){.pb-ms-sheen{animation:none}}"
  );

  const reduced = useReducedMotion();
  const [open, setOpen] = useControllableBoolean(
    expanded,
    defaultExpanded,
    onExpandedChange
  );

  const rawId = React.useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");
  const panelId = `pb-ms-panel-${uid}`;

  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const closeRef = React.useRef<HTMLButtonElement | null>(null);
  // Only steal focus for genuine user toggles — never on mount or when a
  // controlling parent flips the prop for its own layout reasons.
  const userDriven = React.useRef(false);
  const mounted = React.useRef(false);

  const openPanel = React.useCallback(() => {
    userDriven.current = true;
    setOpen(true);
  }, [setOpen]);
  const closePanel = React.useCallback(() => {
    userDriven.current = true;
    setOpen(false);
  }, [setOpen]);

  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (!userDriven.current) return;
    userDriven.current = false;
    // Let AnimatePresence commit the incoming node before we focus it.
    const target = open ? closeRef.current : triggerRef.current;
    target?.focus();
  }, [open]);

  const contentTransition: Transition = reduced
    ? { duration: 0 }
    : CONTENT_EASE;
  const fadeIn = reduced ? { opacity: 1 } : { opacity: 0, y: 6 };
  const fadeOut = reduced ? { opacity: 1 } : { opacity: 0, y: -6 };

  return (
    <motion.div
      layout={reduced ? false : true}
      transition={reduced ? { duration: 0 } : SURFACE_SPRING}
      className={cn(
        "relative isolate inline-flex max-w-full overflow-hidden text-white",
        "border border-white/10 bg-[linear-gradient(180deg,#161618,#0f0f10)]",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_24px_50px_-30px_rgba(0,0,0,0.9)]",
        className
      )}
      style={{
        borderRadius: open ? PANEL_RADIUS : COMPACT_RADIUS,
        ["--pb-ms-accent" as string]: accent,
        ...style,
      }}
      {...rest}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {open ? (
          <motion.div
            key="expanded"
            initial={fadeIn}
            animate={{ opacity: 1, y: 0 }}
            exit={fadeOut}
            transition={contentTransition}
            role="group"
            id={panelId}
            aria-label={panelLabel}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                closePanel();
              }
            }}
            className="relative w-full p-4 sm:p-5"
          >
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 h-px",
                reduced ? "opacity-60" : "pb-ms-sheen"
              )}
              style={
                reduced
                  ? { background: `linear-gradient(90deg,transparent,${accent},transparent)` }
                  : undefined
              }
            />
            <button
              ref={closeRef}
              type="button"
              onClick={closePanel}
              aria-label={closeLabel}
              className={cn(
                "pb-ms-close absolute right-2.5 top-2.5 z-10 grid h-8 w-8 place-items-center",
                "rounded-full text-zinc-400 transition-colors",
                "hover:bg-white/10 hover:text-white"
              )}
            >
              <X aria-hidden size={16} strokeWidth={2.25} />
            </button>
            <div className="pr-8">{expandedContent}</div>
          </motion.div>
        ) : (
          <motion.button
            key="compact"
            type="button"
            ref={triggerRef}
            initial={fadeIn}
            animate={{ opacity: 1, y: 0 }}
            exit={fadeOut}
            transition={contentTransition}
            onClick={openPanel}
            aria-expanded={open}
            aria-controls={panelId}
            className={cn(
              "pb-ms-trigger inline-flex w-full items-center gap-2 rounded-[inherit]",
              "px-3.5 py-2.5 text-left text-sm text-white/90 transition-colors",
              "hover:bg-white/[0.06]"
            )}
          >
            {compact}
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default MorphSurface;
