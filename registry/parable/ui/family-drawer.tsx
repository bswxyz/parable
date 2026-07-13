"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
  type Transition,
} from "motion/react";
import { cn } from "@/lib/utils";

/** Runs layout effects on the client, plain effects on the server (no SSR warning). */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

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

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** Visible, focusable descendants of `root`, in DOM order. */
function getFocusable(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      el.offsetWidth > 0 ||
      el.offsetHeight > 0 ||
      el === document.activeElement
  );
}

export interface FamilyDrawerProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    | "children"
    | "title"
    | "onAnimationStart"
    | "onAnimationEnd"
    | "onAnimationIteration"
    | "onDrag"
    | "onDragStart"
    | "onDragEnd"
  > {
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean;
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean;
  /** Fires with the next open state on trigger, backdrop, Escape, or drag-dismiss. */
  onOpenChange?: (open: boolean) => void;
  /** Renders a built-in trigger button with this label. Omit to open via `open`. */
  triggerLabel?: React.ReactNode;
  /**
   * Drawer body. Swap it to move between steps — the height springs to the new
   * content. Change `contentKey` alongside it to cross-fade the swap.
   */
  children: React.ReactNode;
  /**
   * Identity of the current step. When it changes, the outgoing content
   * cross-fades out as the incoming content fades in and the height morphs.
   * Leave undefined to update children in place (height still morphs).
   */
  contentKey?: React.Key;
  /** Accessible + visible heading. When set, labels the dialog via `aria-labelledby`. */
  title?: React.ReactNode;
  /** Secondary line under the title; describes the dialog via `aria-describedby`. */
  description?: React.ReactNode;
  /** Accent hex — trigger, grabber, focus ring. Mirrors the site `--pb-violet` token. */
  accent?: string;
  /** Panel face colour. Mirrors the site `--pb-ink` token. */
  background?: string;
  /** Downward drag distance (px) past which release dismisses the drawer. */
  dismissThreshold?: number;
}

/**
 * FamilyDrawer — a bottom sheet that springs up from the edge and morphs through
 * a "family" of steps. Swap `children` (optionally with a new `contentKey`) and
 * the panel measures the incoming content and springs its height to fit while
 * the steps cross-fade — step 1 → step 2 → confirm without a layout jump. A
 * grabber handle drags the sheet down; releasing past `dismissThreshold` (or
 * with enough downward velocity) dismisses it, otherwise it springs back.
 *
 * It is a real `role="dialog"` with `aria-modal`: a click on the backdrop or
 * Escape closes it, Tab is trapped inside, focus is handed to the panel on open
 * and returned to the trigger on close, and body scroll is locked while open.
 * Works controlled (`open` + `onOpenChange`) or uncontrolled (`triggerLabel` +
 * `defaultOpen`). Under `prefers-reduced-motion` the height morph, slide, and
 * drag physics are dropped — the sheet shows and hides instantly and steps swap
 * with no motion.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (accent violet `#8b5cf6` on
 * ink `#0f0f10`). Clean-room original inspired by the Vaul / Emil Kowalski
 * drawer genre — credit upstream, no code copied.
 *
 * @parable/family-drawer
 */
export function FamilyDrawer({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  triggerLabel,
  children,
  contentKey,
  title,
  description,
  accent = "#8b5cf6",
  background = "#0f0f10",
  dismissThreshold = 120,
  className,
  style,
  ...rest
}: FamilyDrawerProps) {
  const [open, setOpen] = useControllableState(
    openProp,
    defaultOpen,
    onOpenChange
  );
  const reduce = useReducedMotion() ?? false;

  const uid = React.useId();
  const titleId = `pb-fd-title-${uid}`;
  const descId = `pb-fd-desc-${uid}`;

  const panelRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // Measured natural height of the current step; springs on every content swap.
  const [height, setHeight] = React.useState<number | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    const node = measureRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const measure = () =>
      setHeight(Math.round(node.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => {
      ro.disconnect();
      setHeight(null);
    };
  }, [open]);

  // Modal lifecycle: scroll lock, focus into the panel, Tab trap + Escape,
  // focus returned to whatever was focused when it opened.
  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      (getFocusable(panel)[0] ?? panel)?.focus();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      const items = getFocusable(panel);
      if (items.length === 0) {
        e.preventDefault();
        panel?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !panel?.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel?.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown, true);
      body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, setOpen]);

  const handleDragEnd = React.useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > dismissThreshold || info.velocity.y > 550) {
        setOpen(false);
      }
    },
    [dismissThreshold, setOpen]
  );

  const openSpring: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 230, damping: 26, mass: 0.9 };
  const heightSpring: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 200, damping: 26, mass: 0.7 };
  const contentTransition: Transition = reduce
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.22, 1, 0.36, 1] };
  const backdropTransition: Transition = reduce
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] };

  const vars = {
    "--pb-fd-accent": accent,
    "--pb-fd-bg": background,
  } as React.CSSProperties;

  return (
    <>
      {triggerLabel != null && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          style={{
            ...vars,
            background: `linear-gradient(180deg, ${accent}, ${accent}d9)`,
            boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.25), 0 8px 24px -10px ${accent}b3`,
          }}
          className={cn(
            "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4",
            "text-sm font-semibold text-white transition-[filter,transform] duration-200",
            "hover:brightness-110 active:translate-y-px",
            "outline-none focus-visible:ring-2 focus-visible:ring-[var(--pb-fd-accent)]",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pb-fd-bg)]"
          )}
        >
          {triggerLabel}
        </button>
      )}

      <AnimatePresence>
        {open && [
          <motion.div
            key="pb-fd-backdrop"
            className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            onClick={() => setOpen(false)}
            aria-hidden
          />,
          <motion.div
            key="pb-fd-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title != null ? titleId : undefined}
            aria-describedby={description != null ? descId : undefined}
            aria-label={title != null ? undefined : "Drawer"}
            tabIndex={-1}
            style={{ ...vars, ...style }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[70] mx-auto flex max-h-[88dvh] w-full flex-col",
              "max-w-[26rem] overflow-hidden rounded-t-[1.75rem] outline-none",
              "text-white shadow-[0_-24px_60px_-24px_rgba(0,0,0,0.85)]",
              "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]",
              className
            )}
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={openSpring}
            drag={reduce ? false : "y"}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={handleDragEnd}
            {...rest}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background: `linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0) 30%), ${background}`,
              }}
            />

            {/* Grabber: the drag zone. Pointer-drag only; keyboard closes via Escape. */}
            <div
              onPointerDown={(e) => {
                if (!reduce) dragControls.start(e);
              }}
              style={{ touchAction: "none" }}
              className={cn(
                "flex shrink-0 justify-center pb-1 pt-3",
                reduce ? "cursor-default" : "cursor-grab active:cursor-grabbing"
              )}
            >
              <span
                aria-hidden
                className="h-1.5 w-11 rounded-full bg-white/20"
              />
            </div>

            {(title != null || description != null) && (
              <div className="shrink-0 px-6 pb-1 pt-2">
                {title != null && (
                  <h2
                    id={titleId}
                    className="text-base font-semibold tracking-tight text-white"
                  >
                    {title}
                  </h2>
                )}
                {description != null && (
                  <p
                    id={descId}
                    className="mt-1 text-[13px] leading-relaxed text-white/55"
                  >
                    {description}
                  </p>
                )}
              </div>
            )}

            {/* Scroll region: caps the sheet; the morph container clips within it. */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <motion.div
                initial={false}
                animate={{ height: height ?? "auto" }}
                transition={heightSpring}
                style={{ overflow: "hidden" }}
              >
                <div ref={measureRef} className="relative px-6 pb-6 pt-3">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={contentKey ?? "pb-fd-static"}
                      initial={reduce ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                      transition={contentTransition}
                    >
                      {children}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </motion.div>,
        ]}
      </AnimatePresence>
    </>
  );
}

export default FamilyDrawer;
