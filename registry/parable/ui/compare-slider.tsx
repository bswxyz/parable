"use client";

import * as React from "react";
import { ChevronsLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Round a float to 3 decimals — full-precision floats trip React hydration. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Clamp `n` into the inclusive `[lo, hi]` range. */
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/** Inject a stylesheet once, keyed by a stable id, so multiple instances share it. */
function useInjectedKeyframes(id: string, css: string) {
  React.useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/** Track `prefers-reduced-motion`, defaulting to `false` so SSR and first paint match. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Controlled/uncontrolled number state with a clamping, stable setter. */
function useControllablePosition(
  controlled: number | undefined,
  defaultValue: number,
  onChange?: (value: number) => void
) {
  const [uncontrolled, setUncontrolled] = React.useState(() =>
    clamp(defaultValue, 0, 100)
  );
  const isControlled = controlled !== undefined;
  const value = isControlled ? clamp(controlled, 0, 100) : uncontrolled;
  const setValue = React.useCallback(
    (next: number) => {
      const c = clamp(r3(next), 0, 100);
      if (!isControlled) setUncontrolled(c);
      onChange?.(c);
    },
    [isControlled, onChange]
  );
  return [value, setValue] as const;
}

/** An image panel described by source + alt text, rendered as a bare `<img>`. */
export interface CompareImage {
  src: string;
  alt: string;
}

/** Either arbitrary React content or a `{ src, alt }` image descriptor. */
export type ComparePanel = React.ReactNode | CompareImage;

function isCompareImage(x: ComparePanel): x is CompareImage {
  if (typeof x !== "object" || x === null || React.isValidElement(x)) {
    return false;
  }
  return "src" in x && typeof (x as { src?: unknown }).src === "string";
}

export interface CompareSliderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Left / top-of-stack panel, revealed by the divider. Image descriptor or node. */
  before: ComparePanel;
  /** Right / base panel that fills the frame. Image descriptor or node. */
  after: ComparePanel;
  /** Uncontrolled starting divider position, 0–100. Defaults to `50`. */
  defaultPosition?: number;
  /** Controlled divider position, 0–100. Pair with `onPositionChange`. */
  position?: number;
  /** Fires with the next clamped position whenever the divider moves. */
  onPositionChange?: (position: number) => void;
  /** Corner captions for each panel. */
  labels?: { before: React.ReactNode; after: React.ReactNode };
  /** Accent for the focus ring and idle hint. Mirrors the site `--pb-violet` token. */
  accent?: string;
}

/**
 * CompareSlider — a before/after reveal with a draggable vertical divider. Two
 * panels stack in the same frame: the `after` panel fills the base, the `before`
 * panel sits above it and is masked with a `clip-path` inset so only the region
 * left of the divider shows. A circular grip rides the seam; drag it (pointer
 * capture, so the cursor never outruns the handle), click anywhere on the track
 * to jump the seam there, or focus the grip and drive it from the keyboard —
 * arrows nudge (Shift ×10), PageUp/PageDown jump by 10, Home/End snap to the
 * edges. The grip is a real `role="slider"` with live `aria-valuenow`.
 *
 * Jumps and keyboard steps ease with `cubic-bezier(.22,1,.36,1)`; live dragging
 * tracks 1:1 with the transition suppressed. Under `prefers-reduced-motion` the
 * divider positions directly with no easing and the idle hint is dropped, while
 * the comparison stays fully legible. Position derives from a deterministic
 * default, so server and first client render agree. Panels accept `{ src, alt }`
 * image descriptors or arbitrary nodes.
 *
 * Accent defaults to violet #8b5cf6, mirroring the site's `--pb-*` tokens
 * (violet #8b5cf6 / fuchsia #ec4899 / ember #f5a623 / signal #22d3ee on ink
 * #0f0f10).
 *
 * @parable/compare-slider
 */
export function CompareSlider({
  before,
  after,
  defaultPosition = 50,
  position: positionProp,
  onPositionChange,
  labels,
  accent = "#8b5cf6",
  className,
  style,
  ...props
}: CompareSliderProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const reduce = usePrefersReducedMotion();

  useInjectedKeyframes(
    "pb-compare-slider-kf",
    "@keyframes pb-compare-slider-hint{" +
      "0%{opacity:.55;transform:translate(-50%,-50%) scale(1)}" +
      "70%{opacity:0;transform:translate(-50%,-50%) scale(2.1)}" +
      "100%{opacity:0;transform:translate(-50%,-50%) scale(2.1)}}"
  );

  const [pos, setPos] = useControllablePosition(
    positionProp,
    defaultPosition,
    onPositionChange
  );
  const [dragging, setDragging] = React.useState(false);
  const [hint, setHint] = React.useState(true);

  const labelId = React.useId();
  const smoothing = !reduce && !dragging;
  const ease = "cubic-bezier(.22,1,.36,1)";

  const setFromClientX = React.useCallback(
    (clientX: number) => {
      const root = rootRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      if (!rect.width) return;
      setPos(((clientX - rect.left) / rect.width) * 100);
    },
    [setPos]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    setHint(false);
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setFromClientX(e.clientX);
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onGripKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 1;
    let next: number;
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = pos - step;
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = pos + step;
        break;
      case "PageDown":
        next = pos - 10;
        break;
      case "PageUp":
        next = pos + 10;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 100;
        break;
      default:
        return;
    }
    e.preventDefault();
    setHint(false);
    setPos(next);
  };

  const rounded = Math.round(pos);
  const gripLabel = labels
    ? `Comparison slider`
    : `Before and after comparison slider`;

  const renderPanel = (panel: ComparePanel, base: boolean) => {
    if (isCompareImage(panel)) {
      return (
        <img
          src={panel.src}
          alt={panel.alt}
          draggable={false}
          className={cn(
            "pointer-events-none select-none object-cover",
            base ? "block h-auto w-full" : "block h-full w-full"
          )}
        />
      );
    }
    return panel;
  };

  return (
    <div
      ref={rootRef}
      data-dragging={dragging || undefined}
      style={
        { "--pb-cs-accent": accent, ...style } as React.CSSProperties
      }
      className={cn(
        "relative w-full touch-none select-none overflow-hidden rounded-2xl",
        "bg-[#0f0f10]",
        className
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDragStart={(e) => e.preventDefault()}
      {...props}
    >
      {/* Base panel (after) — establishes the frame's height. */}
      {renderPanel(after, true)}

      {/* Top panel (before) — masked to the region left of the divider. */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: `inset(0 ${r3(100 - pos)}% 0 0)`,
          transition: smoothing ? `clip-path 0.45s ${ease}` : "none",
          willChange: "clip-path",
        }}
      >
        {renderPanel(before, false)}
      </div>

      {labels && (
        <>
          <span
            className={cn(
              "pointer-events-none absolute left-3 top-3 rounded-full px-2.5 py-1",
              "bg-black/55 text-[11px] font-medium tracking-wide text-white/90",
              "backdrop-blur-sm ring-1 ring-white/10"
            )}
          >
            {labels.before}
          </span>
          <span
            className={cn(
              "pointer-events-none absolute right-3 top-3 rounded-full px-2.5 py-1",
              "bg-black/55 text-[11px] font-medium tracking-wide text-white/90",
              "backdrop-blur-sm ring-1 ring-white/10"
            )}
          >
            {labels.after}
          </span>
        </>
      )}

      {/* Divider anchor — a zero-width column parked at `pos`; children center on it. */}
      <div
        className="pointer-events-none absolute inset-y-0"
        style={{
          left: `${r3(pos)}%`,
          width: 0,
          transition: smoothing ? `left 0.45s ${ease}` : "none",
        }}
      >
        {/* Seam line */}
        <div
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 w-0.5 -translate-x-1/2",
            "bg-white/95 shadow-[0_0_0_1px_rgba(0,0,0,0.28)]"
          )}
        />

        {/* Idle hint pulse — dropped under reduced motion or after first interaction. */}
        {hint && !reduce && (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 block size-11 rounded-full"
            style={{
              border: "2px solid var(--pb-cs-accent)",
              transform: "translate(-50%, -50%)",
              animation: "pb-compare-slider-hint 2.6s ease-in-out infinite",
            }}
          />
        )}

        {/* Grip — the ARIA slider. */}
        <div
          role="slider"
          tabIndex={0}
          aria-label={gripLabel}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={rounded}
          aria-valuetext={`${rounded}%`}
          aria-describedby={labels ? labelId : undefined}
          onKeyDown={onGripKeyDown}
          onFocus={() => setHint(false)}
          className={cn(
            "pointer-events-auto absolute left-0 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2",
            "cursor-ew-resize place-items-center rounded-full outline-none",
            "bg-white text-[#0f0f10] shadow-[0_2px_14px_rgba(0,0,0,0.4)] ring-1 ring-black/10",
            "transition-transform duration-200 ease-out",
            "hover:scale-105 active:scale-95",
            "focus-visible:ring-2 focus-visible:ring-[var(--pb-cs-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f10]"
          )}
        >
          <ChevronsLeftRight className="size-5" strokeWidth={2.25} />
        </div>
      </div>

      {labels && (
        <span id={labelId} className="sr-only">
          Left of the divider shows {labels.before}; right shows {labels.after}.
        </span>
      )}
    </div>
  );
}

export default CompareSlider;
