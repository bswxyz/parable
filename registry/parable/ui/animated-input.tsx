"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { cn } from "@/lib/utils";

export interface AnimatedInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "defaultValue" | "onChange"
  > {
  /** Text of the floating `<label>` (wired to the input via `htmlFor`/`id`). */
  label: React.ReactNode;
  /** Controlled value. Pair with `onChange`. */
  value?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  /** Native change handler; fires on every keystroke in both modes. */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** When set, the field enters its error state: red hint + shake + `aria-invalid`. */
  error?: string;
  /** Optional decorative leading icon (rendered `aria-hidden`, tints with state). */
  icon?: React.ReactNode;
  /** Show the drawn success tick on the right (ignored while `error` is set). */
  success?: boolean;
  /** Accent for the drawn underline, caret, focus ring, and focused label. Mirrors `--pb-violet`. */
  accent?: string;
  /** Error tone for the hint, underline, and label. Mirrors `--pb-fuchsia`. */
  errorColor?: string;
  /** Success tone for the tick. Mirrors `--pb-cyan`. */
  successColor?: string;
  /** Backdrop the focus ring offsets against. Mirrors `--pb-ink`. */
  ink?: string;
}

/**
 * AnimatedInput — a polished text field with a spring floating label that rises
 * on focus or fill, an accent underline that draws out from the centre when the
 * field is active, an optional tinting leading icon, and typed feedback: an
 * `error` string shakes the field once, paints a live-announced red hint, and
 * sets `aria-invalid`, while `success` draws a check tick on the right.
 *
 * Works controlled (`value` + `onChange`) or uncontrolled (`defaultValue`), with
 * real `<label htmlFor>`/`id` wiring, `aria-describedby` pointing at the hint,
 * and `aria-live="polite"` so the error is spoken as it appears. Under
 * `prefers-reduced-motion` every transition collapses to an instant, legible
 * state — no shake, no draw, no float tween — and the focus ring uses
 * `:focus-visible`.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (accent = violet #8b5cf6,
 * error = fuchsia #ec4899, success = signal cyan #22d3ee, ring offset = ink
 * #0f0f10).
 *
 * @parable/animated-input
 */
export const AnimatedInput = React.forwardRef<
  HTMLInputElement,
  AnimatedInputProps
>(function AnimatedInput(
  {
    label,
    type = "text",
    value: valueProp,
    defaultValue,
    onChange,
    error,
    icon,
    success = false,
    accent = "#8b5cf6",
    errorColor = "#ec4899",
    successColor = "#22d3ee",
    ink = "#0f0f10",
    id: idProp,
    disabled,
    required,
    placeholder,
    onFocus,
    onBlur,
    className,
    style,
    "aria-describedby": ariaDescribedBy,
    ...rest
  },
  ref
) {
  const reduce = useReducedMotion();
  const reactId = React.useId();
  const id = idProp ?? `pb-ai-${reactId}`;
  const errorId = `pb-ai-err-${reactId}`;

  // Controlled/uncontrolled value — always render controlled so `filled` is
  // known, falling back to internal state when no `value` prop is supplied.
  const isControlled = valueProp !== undefined;
  const [internalValue, setInternalValue] = React.useState(
    defaultValue ?? ""
  );
  const value = isControlled ? valueProp : internalValue;
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternalValue(event.target.value);
      onChange?.(event);
    },
    [isControlled, onChange]
  );

  const [focused, setFocused] = React.useState(false);
  const filled = String(value).length > 0;
  const floated = focused || filled;
  const hasError = Boolean(error);
  const showTick = success && !hasError;

  const describedBy =
    [ariaDescribedBy, hasError ? errorId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  // Fire a single horizontal shake when the field first enters its error state.
  const controls = useAnimationControls();
  const prevError = React.useRef(error);
  React.useEffect(() => {
    const wasError = Boolean(prevError.current);
    prevError.current = error;
    if (!error || wasError) return;
    if (reduce) {
      controls.set({ x: 0 });
      return;
    }
    controls.start({
      x: [0, -6, 6, -5, 5, -3, 0],
      transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
    });
  }, [error, reduce, controls]);

  const labelTransition: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 260, damping: 22, mass: 0.9 };
  const drawTransition: Transition = reduce
    ? { duration: 0 }
    : { duration: 0.45, ease: [0.22, 1, 0.36, 1] };
  const tickTransition: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 240, damping: 18 };

  const vars = {
    "--pb-ai-accent": accent,
    "--pb-ai-error": errorColor,
    "--pb-ai-success": successColor,
    "--pb-ai-ink": ink,
  } as React.CSSProperties;

  return (
    <div className={cn("w-full", className)} style={{ ...vars, ...style }}>
      <motion.div
        animate={controls}
        data-focused={focused || undefined}
        data-filled={filled || undefined}
        data-error={hasError ? "" : undefined}
        className={cn(
          "group relative rounded-t-lg bg-white/[0.035]",
          "transition-colors duration-200 hover:bg-white/[0.055]",
          disabled && "pointer-events-none opacity-55"
        )}
      >
        {icon && (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute bottom-0 left-0 top-0 grid w-11 place-items-center",
              "transition-colors duration-200 [&_svg]:size-5",
              hasError
                ? "text-[var(--pb-ai-error)]"
                : focused
                  ? "text-[var(--pb-ai-accent)]"
                  : "text-white/40"
            )}
          >
            {icon}
          </span>
        )}

        <input
          {...rest}
          ref={ref}
          id={id}
          type={type}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          placeholder={floated ? placeholder : undefined}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "peer h-14 w-full rounded-t-lg bg-transparent pb-1.5 pt-6",
            "text-[15px] leading-5 text-white/95 caret-[var(--pb-ai-accent)]",
            "outline-none transition-shadow duration-200",
            "placeholder:text-white/30",
            "disabled:cursor-not-allowed",
            icon ? "pl-11" : "pl-3.5",
            showTick ? "pr-11" : "pr-3.5",
            "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pb-ai-ink)]",
            hasError
              ? "focus-visible:ring-[var(--pb-ai-error)]/60"
              : "focus-visible:ring-[var(--pb-ai-accent)]/55"
          )}
        />

        <motion.label
          htmlFor={id}
          initial={false}
          animate={{ y: floated ? -14 : 0, scale: floated ? 0.75 : 1 }}
          transition={labelTransition}
          className={cn(
            "pointer-events-none absolute top-[18px] origin-left",
            "text-[15px] leading-5 transition-colors duration-200",
            icon ? "left-11" : "left-3.5",
            hasError
              ? "text-[var(--pb-ai-error)]"
              : focused
                ? "text-[var(--pb-ai-accent)]"
                : "text-white/45"
          )}
        >
          {label}
          {required && (
            <span aria-hidden className="text-[var(--pb-ai-error)]">
              {" *"}
            </span>
          )}
        </motion.label>

        {/* Success tick — centred over the field height so the draw can scale
            freely without fighting a translate. */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-3 top-0 grid place-items-center"
        >
          <AnimatePresence initial={false}>
            {showTick && (
              <motion.span
                key="tick"
                initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
                transition={tickTransition}
                className="text-[var(--pb-ai-success)]"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <motion.path
                    d="M4 12.5 9.5 18 20 6.5"
                    initial={reduce ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.06 }
                    }
                  />
                </svg>
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Baseline + centre-drawn accent underline. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/[0.14]"
        />
        <motion.span
          aria-hidden
          initial={false}
          animate={{
            scaleX: focused || hasError ? 1 : 0,
            opacity: focused || hasError ? 1 : 0,
          }}
          transition={drawTransition}
          style={{
            background: hasError
              ? "var(--pb-ai-error)"
              : "var(--pb-ai-accent)",
          }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-center rounded-full"
        />
      </motion.div>

      {/* Live region: always mounted so the error is announced when it appears,
          and reserving a line so the layout does not jump. */}
      <p
        id={errorId}
        aria-live="polite"
        className="mt-1.5 min-h-4 px-1 text-xs leading-4 text-[var(--pb-ai-error)]"
      >
        <AnimatePresence initial={false} mode="wait">
          {hasError ? (
            <motion.span
              key={error}
              initial={reduce ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={
                reduce ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
              }
              className="block"
            >
              {error}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </p>
    </div>
  );
});

export default AnimatedInput;
