"use client";

import * as React from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { cn } from "@/lib/utils";

/** Round a float to 3 decimals — full-precision floats trip React hydration. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Controlled/uncontrolled string state with a stable setter. */
function useControllableState(
  controlled: string | undefined,
  defaultValue: string,
  onChange?: (value: string) => void
) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : uncontrolled;
  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) setUncontrolled(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );
  return [value, setValue] as const;
}

const SIZES = {
  sm: {
    pad: 3, // track inset, px — also the goo layer inset
    blur: 6, // feGaussianBlur stdDeviation
    button: "gap-1.5 px-3 py-1.5 text-xs",
    icon: "[&_svg]:size-3.5",
  },
  md: {
    pad: 4,
    blur: 8,
    button: "gap-2 px-4 py-2 text-sm",
    icon: "[&_svg]:size-4",
  },
} as const;

export interface GooeyToggleOption {
  /** Stable identity emitted through `onValueChange`. */
  value: string;
  /** Crisp text rendered above the gooey layer. */
  label: string;
  /** Optional leading glyph (e.g. a lucide icon). Rendered `aria-hidden`. */
  icon?: React.ReactNode;
}

export interface GooeyToggleProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "defaultValue"> {
  /** Segments to choose between. Rendered as equal-width columns. */
  options: GooeyToggleOption[];
  /** Controlled active value. Pair with `onValueChange`. */
  value?: string;
  /** Uncontrolled initial value. Defaults to the first option. */
  defaultValue?: string;
  /** Fires with the next value when the selection changes. */
  onValueChange?: (value: string) => void;
  /** Indicator + focus-ring colour. Mirrors the site `--pb-violet` token. */
  color?: string;
  /** Visual density. */
  size?: "sm" | "md";
}

/**
 * GooeyToggle — a segmented radio group whose active pill travels between
 * options with a gooey liquid stretch. Two coincident indicator pills (a snappy
 * leader and a softer follower) live inside an SVG goo-filtered layer: a wide
 * `feGaussianBlur` spreads their alpha and an alpha-contrast `feColorMatrix`
 * re-thresholds it, so while the follower lags the pair reads as one skin that
 * necks and stretches, then snaps clean when both springs settle. The labels
 * render crisp OUTSIDE the filtered layer, above it, so text stays sharp.
 *
 * Fully keyboard operable as a radiogroup: roving tabindex, arrow keys move and
 * select (wrapping), Home/End jump to the ends. Under `prefers-reduced-motion`
 * the indicator jumps instantly with no goo travel — a static, legible pill
 * under the active label. Positions are percentage-derived (equal columns), so
 * the server and first client render match with no measurement.
 *
 * Default colour (violet #8b5cf6) mirrors the site's `--pb-*` tokens
 * (fuchsia #ec4899, ember #f5a623, signal #22d3ee, ink #0f0f10).
 *
 * @parable/gooey-toggle
 */
export function GooeyToggle({
  options,
  value: valueProp,
  defaultValue,
  onValueChange,
  color = "#8b5cf6",
  size = "md",
  className,
  style,
  ...props
}: GooeyToggleProps) {
  const reduce = useReducedMotion();
  const cfg = SIZES[size];
  const n = options.length;

  const [value, setValue] = useControllableState(
    valueProp,
    defaultValue ?? options[0]?.value ?? "",
    onValueChange
  );

  // -1 (value not among options) falls back to the first column.
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );

  const rawId = React.useId();
  const gooId = `pb-gooey-toggle-goo-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  const buttonRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const leaderT: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 260, damping: 24, mass: 0.85 };
  const followerT: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 180, damping: 26, mass: 1 };

  const segPct = n > 0 ? r3(100 / n) : 100;
  // x is a multiple of the pill's own width (= one column), so integer percents
  // land exactly on each column with no measurement and no hydration drift.
  const indicatorX = `${activeIndex * 100}%`;

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (n === 0) return;
    let next = i;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = (i + 1) % n;
        break;
      case "ArrowLeft":
      case "ArrowUp":
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
    setValue(options[next].value);
    buttonRefs.current[next]?.focus();
  };

  const pillClass = "absolute top-0 h-full rounded-full";
  const pillStyle: React.CSSProperties = {
    width: `${segPct}%`,
    left: 0,
    background: color,
    willChange: "transform",
  };

  return (
    <div
      role="radiogroup"
      className={cn(
        "relative isolate inline-grid overflow-hidden rounded-full",
        "border border-white/10 bg-white/5",
        className
      )}
      style={
        {
          "--pb-gt-color": color,
          gridTemplateColumns: `repeat(${Math.max(n, 1)}, minmax(0, 1fr))`,
          padding: cfg.pad,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      <svg
        aria-hidden
        className="pointer-events-none absolute h-0 w-0"
        focusable="false"
      >
        <defs>
          <filter
            id={gooId}
            x="-20%"
            y="-50%"
            width="140%"
            height="200%"
            colorInterpolationFilters="sRGB"
          >
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation={cfg.blur}
              result="blur"
            />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
            />
          </filter>
        </defs>
      </svg>

      {n > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-0"
          style={{ inset: cfg.pad, filter: `url(#${gooId})` }}
        >
          {/* Follower trails behind the leader; the goo bridges the gap into a
              liquid neck. Under reduced motion both coincide — a clean pill. */}
          <motion.div
            className={pillClass}
            style={pillStyle}
            initial={false}
            animate={{ x: indicatorX }}
            transition={followerT}
          />
          <motion.div
            className={pillClass}
            style={pillStyle}
            initial={false}
            animate={{ x: indicatorX }}
            transition={leaderT}
          />
        </div>
      )}

      {options.map((o, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={o.value}
            ref={(el) => {
              buttonRefs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => setValue(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "relative z-10 flex items-center justify-center rounded-full",
              "cursor-pointer select-none font-medium outline-none",
              "transition-colors duration-200",
              cfg.button,
              cfg.icon,
              active ? "text-white" : "text-white/55 hover:text-white/80",
              "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pb-gt-color)]"
            )}
            style={
              active
                ? { textShadow: "0 1px 8px rgba(0,0,0,0.25)" }
                : undefined
            }
          >
            {o.icon != null && (
              <span aria-hidden className="flex shrink-0 items-center">
                {o.icon}
              </span>
            )}
            <span className="whitespace-nowrap">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default GooeyToggle;
