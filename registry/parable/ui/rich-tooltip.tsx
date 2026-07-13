"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { cn } from "@/lib/utils";

/** `useLayoutEffect` on the client, `useEffect` on the server (no SSR warning). */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

type Side = "top" | "bottom" | "left" | "right";

/** Diagonal half of the arrow square, in px — how far the arrow protrudes. */
const ARROW = 9;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function opposite(side: Side): Side {
  return side === "top"
    ? "bottom"
    : side === "bottom"
      ? "top"
      : side === "left"
        ? "right"
        : "left";
}

interface Placement {
  side: Side;
  top: number;
  left: number;
  /** Arrow centre offset from the tooltip's left edge (top/bottom sides). */
  arrowLeft: number;
  /** Arrow centre offset from the tooltip's top edge (left/right sides). */
  arrowTop: number;
}

/**
 * Edge-aware placement: try the preferred side, flip to its opposite if the
 * tooltip would overflow, else keep whichever side has more room. The cross
 * axis is clamped inside the viewport and the arrow tracks the trigger centre.
 * All outputs are rounded so no full-precision float reaches inline style.
 */
function place(
  t: DOMRect,
  w: number,
  h: number,
  side: Side,
  offset: number,
  margin: number,
  vw: number,
  vh: number
): Placement {
  const fits = (s: Side): boolean => {
    if (s === "top") return t.top - offset - h >= margin;
    if (s === "bottom") return t.bottom + offset + h <= vh - margin;
    if (s === "left") return t.left - offset - w >= margin;
    return t.right + offset + w <= vw - margin;
  };
  const room = (s: Side): number => {
    if (s === "top") return t.top;
    if (s === "bottom") return vh - t.bottom;
    if (s === "left") return t.left;
    return vw - t.right;
  };

  let s = side;
  if (!fits(s)) {
    const o = opposite(s);
    s = fits(o) ? o : room(o) > room(s) ? o : s;
  }

  let top: number;
  let left: number;
  if (s === "top" || s === "bottom") {
    left = clamp(
      t.left + t.width / 2 - w / 2,
      margin,
      Math.max(margin, vw - margin - w)
    );
    top = s === "top" ? t.top - offset - h : t.bottom + offset;
  } else {
    top = clamp(
      t.top + t.height / 2 - h / 2,
      margin,
      Math.max(margin, vh - margin - h)
    );
    left = s === "left" ? t.left - offset - w : t.right + offset;
  }

  const cx = t.left + t.width / 2;
  const cy = t.top + t.height / 2;
  return {
    side: s,
    top: Math.round(top),
    left: Math.round(left),
    arrowLeft: Math.round(clamp(cx - left, ARROW, Math.max(ARROW, w - ARROW))),
    arrowTop: Math.round(clamp(cy - top, ARROW, Math.max(ARROW, h - ARROW))),
  };
}

/** Merge several refs (object or callback) into one callback ref. */
function composeRefs<T>(
  ...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}

/** Run every provided handler in order. */
function chain<E>(
  ...fns: Array<((event: E) => void) | undefined>
): (event: E) => void {
  return (event) => {
    for (const fn of fns) fn?.(event);
  };
}

/** Shape of the props we read off / merge into the cloned trigger element. */
type TriggerProps = {
  ref?: React.Ref<HTMLElement>;
  onPointerEnter?: React.PointerEventHandler<HTMLElement>;
  onPointerLeave?: React.PointerEventHandler<HTMLElement>;
  onFocus?: React.FocusEventHandler<HTMLElement>;
  onBlur?: React.FocusEventHandler<HTMLElement>;
  "aria-describedby"?: string;
};

export interface RichTooltipProps {
  /** Rich tooltip body — any node, not just a string. */
  content: React.ReactNode;
  /** The single element that opens the tooltip on hover / focus. */
  children: React.ReactElement;
  /** Preferred side; auto-flips to the opposite side on overflow. */
  side?: Side;
  /** Open delay in ms after hover / focus begins. */
  delay?: number;
  /** Close delay in ms — the grace window to cross into the tooltip. */
  closeDelay?: number;
  /** Distance in px between the trigger and the tooltip box. */
  offset?: number;
  /** Max tooltip width in px. */
  maxWidth?: number;
  /** Surface colour. Mirrors the site `--pb-ink` token. */
  background?: string;
  /** Accent for the hairline edge glow. Mirrors the site `--pb-violet` token. */
  accent?: string;
  /** Extra classes on the tooltip surface. */
  className?: string;
}

/**
 * RichTooltip — a Vercel-style rich tooltip that springs open from the trigger
 * with a scale + fade, carries a real arrow, and holds arbitrary ReactNode
 * content (headings, media, key hints) rather than a bare string. Placement is
 * computed by hand — no positioning lib — measuring the trigger and tooltip
 * with `getBoundingClientRect` / `offsetWidth` in a layout effect, then
 * auto-flipping top⇄bottom or left⇄right when the preferred side would overflow
 * the viewport and clamping the cross axis so it never leaves the screen. It
 * renders through a `createPortal` to `document.body` so overflow / transforms
 * on ancestors can't clip it, and repositions on scroll and resize.
 *
 * Hover and keyboard focus both open it (with small open / close delays);
 * moving the pointer into the tooltip keeps it open, Escape dismisses it, and
 * blur / pointer-leave close it. The trigger gets `aria-describedby` pointing at
 * the `role="tooltip"` surface. Under `prefers-reduced-motion` the show / hide
 * is instant with no scale. Colour defaults mirror the site's `--pb-*` tokens
 * (ink #0f0f10 surface, violet #8b5cf6 accent).
 *
 * @parable/rich-tooltip
 */
export function RichTooltip({
  content,
  children,
  side = "top",
  delay = 150,
  closeDelay = 120,
  offset = 8,
  maxWidth = 264,
  background = "#0f0f10",
  accent = "#8b5cf6",
  className,
}: RichTooltipProps) {
  const reduce = useReducedMotion();

  const triggerRef = React.useRef<HTMLElement | null>(null);
  const tooltipRef = React.useRef<HTMLDivElement | null>(null);

  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<Placement | null>(null);

  const tooltipId = React.useId();

  // Interaction flags drive a single debounced open/close decision, so the
  // tooltip stays open while EITHER the pointer is over it OR the trigger is
  // focused — and never flickers when crossing the gap between the two.
  const hoverTrigger = React.useRef(false);
  const hoverTooltip = React.useRef(false);
  const focused = React.useRef(false);
  const dismissed = React.useRef(false);
  const openRef = React.useRef(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => setMounted(true), []);

  const sync = React.useCallback(() => {
    const target =
      !dismissed.current &&
      (hoverTrigger.current || hoverTooltip.current || focused.current);
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (target === openRef.current) return;
    timer.current = setTimeout(
      () => {
        openRef.current = target;
        // Force a fresh measurement on open; keep the last position on close
        // so the exit animation plays in place instead of jumping to (0,0).
        if (target) setPos(null);
        setOpen(target);
        timer.current = null;
      },
      target ? delay : closeDelay
    );
  }, [delay, closeDelay]);

  const reposition = React.useCallback(() => {
    const trigger = triggerRef.current;
    const tip = tooltipRef.current;
    if (!trigger || !tip) return;
    // offsetWidth/Height are the untransformed layout size, so measuring works
    // even mid-spring while the surface is scaled by Motion.
    setPos(
      place(
        trigger.getBoundingClientRect(),
        tip.offsetWidth,
        tip.offsetHeight,
        side,
        offset + ARROW / 2,
        8,
        window.innerWidth,
        window.innerHeight
      )
    );
  }, [side, offset]);

  // Measure before the browser paints the freshly-mounted tooltip — no flash
  // at (0,0) — then keep it pinned to the trigger while it stays open.
  useIsoLayoutEffect(() => {
    if (!open) return;
    reposition();
    const onScroll = () => reposition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => reposition())
        : null;
    if (ro && tooltipRef.current) ro.observe(tooltipRef.current);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      ro?.disconnect();
    };
  }, [open, reposition]);

  // Escape dismisses while open and blocks re-open until interaction restarts.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      dismissed.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      openRef.current = false;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const childProps = children.props as TriggerProps;

  const trigger = React.cloneElement(children, {
    ref: composeRefs(triggerRef, childProps.ref),
    onPointerEnter: chain(childProps.onPointerEnter, (e) => {
      // Ignore emulated hover from touch; those devices have no hover.
      if (e.pointerType === "touch") return;
      dismissed.current = false;
      hoverTrigger.current = true;
      sync();
    }),
    onPointerLeave: chain(childProps.onPointerLeave, (e) => {
      if (e.pointerType === "touch") return;
      hoverTrigger.current = false;
      dismissed.current = false;
      sync();
    }),
    onFocus: chain(childProps.onFocus, () => {
      dismissed.current = false;
      focused.current = true;
      sync();
    }),
    onBlur: chain(childProps.onBlur, () => {
      focused.current = false;
      dismissed.current = false;
      sync();
    }),
    "aria-describedby": open
      ? tooltipId
      : (childProps["aria-describedby"] ?? undefined),
  } as Partial<TriggerProps>);

  const spring: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 260, damping: 22, mass: 0.8 };

  const s = pos?.side ?? side;
  const transformOrigin = pos
    ? s === "top"
      ? `${pos.arrowLeft}px 100%`
      : s === "bottom"
        ? `${pos.arrowLeft}px 0%`
        : s === "left"
          ? `100% ${pos.arrowTop}px`
          : `0% ${pos.arrowTop}px`
    : "center";

  const arrowStyle: React.CSSProperties = { position: "absolute" };
  if (pos) {
    if (s === "top") {
      arrowStyle.bottom = -ARROW / 2;
      arrowStyle.left = pos.arrowLeft - ARROW / 2;
      arrowStyle.borderRight = "1px solid var(--pb-rt-edge)";
      arrowStyle.borderBottom = "1px solid var(--pb-rt-edge)";
    } else if (s === "bottom") {
      arrowStyle.top = -ARROW / 2;
      arrowStyle.left = pos.arrowLeft - ARROW / 2;
      arrowStyle.borderLeft = "1px solid var(--pb-rt-edge)";
      arrowStyle.borderTop = "1px solid var(--pb-rt-edge)";
    } else if (s === "left") {
      arrowStyle.right = -ARROW / 2;
      arrowStyle.top = pos.arrowTop - ARROW / 2;
      arrowStyle.borderTop = "1px solid var(--pb-rt-edge)";
      arrowStyle.borderRight = "1px solid var(--pb-rt-edge)";
    } else {
      arrowStyle.left = -ARROW / 2;
      arrowStyle.top = pos.arrowTop - ARROW / 2;
      arrowStyle.borderBottom = "1px solid var(--pb-rt-edge)";
      arrowStyle.borderLeft = "1px solid var(--pb-rt-edge)";
    }
  }

  const surface = mounted
    ? createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="pb-rich-tooltip"
              ref={tooltipRef}
              role="tooltip"
              id={tooltipId}
              initial={
                reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92 }
              }
              animate={
                reduce
                  ? { opacity: 1 }
                  : { opacity: pos ? 1 : 0, scale: pos ? 1 : 0.92 }
              }
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
              transition={spring}
              onPointerEnter={(e) => {
                if (e.pointerType === "touch") return;
                hoverTooltip.current = true;
                sync();
              }}
              onPointerLeave={(e) => {
                if (e.pointerType === "touch") return;
                hoverTooltip.current = false;
                sync();
              }}
              style={
                {
                  position: "fixed",
                  top: pos?.top ?? 0,
                  left: pos?.left ?? 0,
                  maxWidth,
                  transformOrigin,
                  zIndex: 2147483647,
                  visibility: pos ? "visible" : "hidden",
                  "--pb-rt-edge": "color-mix(in srgb, #ffffff 12%, transparent)",
                  background,
                  color: "rgba(255,255,255,0.92)",
                } as React.CSSProperties
              }
              className={cn(
                "pointer-events-auto rounded-xl border border-white/10 px-3 py-2",
                "text-[13px] leading-relaxed shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]",
                "backdrop-blur-md",
                className
              )}
            >
              {/* Accent edge glow — decorative. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-xl"
                style={{
                  boxShadow: `inset 0 1px 0 0 color-mix(in srgb, ${accent} 22%, transparent)`,
                }}
              />
              <span
                aria-hidden
                style={{
                  width: ARROW,
                  height: ARROW,
                  background,
                  transform: "rotate(45deg)",
                  ...arrowStyle,
                }}
              />
              <div className="relative">{content}</div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )
    : null;

  return (
    <>
      {trigger}
      {surface}
    </>
  );
}

export default RichTooltip;
