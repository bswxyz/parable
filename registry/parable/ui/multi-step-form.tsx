"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { ArrowLeft, ArrowRight, Check, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/** Runs layout effects on the client, plain effects on the server (no SSR warning). */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/** Round a float to 3 decimals — full-precision floats trip React hydration. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Clamp an index into `[0, count - 1]`. */
function clampIndex(value: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(value, 0), count - 1);
}

/**
 * Controllable number state with a stable setter. When `controlled` is defined
 * the value is driven by the prop and the setter only forwards to `onChange`;
 * otherwise it holds its own state. Lets `MultiStepForm` be either controlled
 * (`currentIndex` + `onIndexChange`) or uncontrolled (`defaultIndex`).
 */
function useControllableIndex(
  controlled: number | undefined,
  defaultValue: number,
  onChange?: (value: number) => void
) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const isControlled = controlled !== undefined;
  const value = isControlled ? (controlled as number) : uncontrolled;
  const setValue = React.useCallback(
    (next: number) => {
      if (!isControlled) setUncontrolled(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );
  return [value, setValue] as const;
}

export interface WizardStep {
  /** Stable identity for the step — used as the React key. */
  id: string;
  /** Heading shown in the panel and announced when the step becomes active. */
  title: React.ReactNode;
  /** Body of the step — arbitrary form fields, copy, or a review summary. */
  content: React.ReactNode;
  /**
   * Optional gate run when the user tries to advance. Return `true` (or nothing)
   * to allow it; return `false` for a generic error, or a non-empty string to
   * show that message. The step will not advance while it reports an error.
   */
  validate?: () => boolean | string;
}

export interface MultiStepFormProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Ordered steps the wizard walks through; the last one is the submit step. */
  steps: WizardStep[];
  /** Fires when the final step passes validation and the form is submitted. */
  onComplete?: () => void;
  /** Controlled active-step index. Pair with `onIndexChange`. */
  currentIndex?: number;
  /** Uncontrolled initial active-step index. */
  defaultIndex?: number;
  /** Fires with the next index on Back / Next / step-marker navigation. */
  onIndexChange?: (index: number) => void;
  /** Accent hex — progress fill, active marker, focus ring. Mirrors `--pb-violet`. */
  accent?: string;
  /** Card surface colour. Mirrors the site `--pb-ink` token. */
  background?: string;
  /** Label for the back button. */
  backLabel?: React.ReactNode;
  /** Label for the advance button on non-final steps. */
  nextLabel?: React.ReactNode;
  /** Label for the advance button on the final step. */
  submitLabel?: React.ReactNode;
}

const DANGER = "#fb7185"; // rose — validation errors

/**
 * MultiStepForm — a self-contained wizard block (no form libraries). A numbered
 * progress header tracks position: a track runs behind the step markers and a
 * gradient fill springs along it as you advance, exposed to assistive tech as a
 * single `role="progressbar"`; completed markers flip to a check and are
 * clickable to jump back. Each step panel cross-fades and slides in the travel
 * direction — forward from the right, Back from the left — while the panel's
 * height springs to fit the incoming content so mismatched steps morph without a
 * jump. Back / Next drive navigation, and Next is gated by the step's optional
 * `validate()`: a returned `false` or message string blocks the advance and
 * raises a `role="alert"`. The final step's button submits and fires
 * `onComplete`.
 *
 * Works controlled (`currentIndex` + `onIndexChange`) or uncontrolled
 * (`defaultIndex`). On every step change a polite live region announces the new
 * position and focus moves to the incoming panel heading. Under
 * `prefers-reduced-motion` the slide, blur, and height morph are dropped — steps
 * swap instantly and the bar fills without transition.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (accent violet `#8b5cf6` on
 * ink `#0f0f10`; the progress fill blends violet into fuchsia `#ec4899`).
 *
 * @parable/multi-step-form
 */
export function MultiStepForm({
  steps,
  onComplete,
  currentIndex,
  defaultIndex = 0,
  onIndexChange,
  accent = "#8b5cf6",
  background = "#0f0f10",
  backLabel = "Back",
  nextLabel = "Continue",
  submitLabel = "Submit",
  className,
  style,
  ...props
}: MultiStepFormProps) {
  const reduce = useReducedMotion() ?? false;
  const count = steps.length;

  const [indexRaw, setIndex] = useControllableIndex(
    currentIndex,
    defaultIndex,
    onIndexChange
  );
  const active = clampIndex(indexRaw, count);

  const [error, setError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const headingId = `pb-msf-heading-${uid}-${active}`;
  const errorId = `pb-msf-error-${uid}`;

  // Travel direction from the delta versus the previously rendered step, so it
  // is correct whether navigation came from our buttons or a controlled prop.
  const prevIndexRef = React.useRef(active);
  const direction = active >= prevIndexRef.current ? 1 : -1;
  React.useEffect(() => {
    prevIndexRef.current = active;
  }, [active]);

  // Any change of the active step clears the transient error + submit state.
  React.useEffect(() => {
    setError(null);
    setSubmitted(false);
  }, [active]);

  // Height morph: measure the natural height of the live panel and spring to it.
  const measureRef = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState<number | null>(null);
  useIsoLayoutEffect(() => {
    if (reduce) return;
    const node = measureRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const measure = () =>
      setHeight(Math.round(node.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [reduce]);

  // Move focus to the incoming panel heading — but never on the first mount, so
  // the wizard does not grab focus or scroll on load. Target by id (not a ref):
  // during the cross-fade the old and new headings briefly coexist, and the id
  // carries `active`, so it always resolves to the incoming one.
  const firstMount = React.useRef(true);
  React.useEffect(() => {
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    document.getElementById(headingId)?.focus({ preventScroll: true });
  }, [active, headingId]);

  const goTo = React.useCallback(
    (next: number) => setIndex(clampIndex(next, count)),
    [setIndex, count]
  );

  const handleBack = () => {
    if (active > 0) goTo(active - 1);
  };

  const handleMarker = (i: number) => {
    // Only completed (earlier) steps are reachable by marker — advancing must
    // pass through validation.
    if (i < active) goTo(i);
  };

  const handleNext = () => {
    const result = steps[active]?.validate?.();
    const invalid =
      result === false || (typeof result === "string" && result.trim() !== "");
    if (invalid) {
      setError(
        typeof result === "string"
          ? result
          : "Please complete this step before continuing."
      );
      return;
    }
    setError(null);
    if (active >= count - 1) {
      setSubmitted(true);
      onComplete?.();
    } else {
      goTo(active + 1);
    }
  };

  const isLast = active >= count - 1;
  const step = count > 0 ? steps[active] : undefined;

  // Progress fraction along the track (0..100), driving both the bar and aria.
  const pct = submitted
    ? 100
    : count <= 1
      ? 100
      : r3((active / (count - 1)) * 100);
  const ariaNow = Math.round(pct);

  const spring: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 240, damping: 26, mass: 0.9 };
  const heightSpring: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 220, damping: 26, mass: 0.8 };
  const barSpring: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 200, damping: 28, mass: 0.9 };

  const stepVariants: Variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir >= 0 ? 34 : -34, filter: "blur(6px)" }),
    center: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: (dir: number) => ({ opacity: 0, x: dir >= 0 ? -34 : 34, filter: "blur(6px)" }),
  };

  const vars = {
    "--pb-msf-accent": accent,
    "--pb-msf-bg": background,
  } as React.CSSProperties;

  const panelBody = step ? (
    <>
      <h3
        id={headingId}
        tabIndex={-1}
        className="text-base font-semibold tracking-tight text-white outline-none"
      >
        {step.title}
      </h3>
      <div className="mt-3 text-[13px] leading-relaxed text-white/70">
        {step.content}
      </div>
    </>
  ) : null;

  return (
    <div
      style={{ ...vars, ...style }}
      className={cn(
        "relative w-full max-w-full overflow-hidden rounded-2xl border border-white/10",
        "bg-[linear-gradient(180deg,#151517,var(--pb-msf-bg))] p-5 text-white sm:p-6",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_24px_60px_-30px_rgba(0,0,0,0.85)]",
        className
      )}
      {...props}
    >
      {/* Polite live region — announces step position + completion. */}
      <div aria-live="polite" role="status" className="sr-only">
        {submitted
          ? "Form submitted. All steps complete."
          : `Step ${active + 1} of ${count}${
              typeof step?.title === "string" ? `, ${step.title}` : ""
            }.`}
      </div>

      {/* Progress header: counter + numbered markers over an animated bar. */}
      <div className="mb-6 sm:mb-9">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-xs font-medium tracking-wide text-white/45 tabular-nums">
            Step {Math.min(active + 1, count)} of {count}
          </span>
          {submitted && (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium"
              style={{ color: accent }}
            >
              <Check className="size-3.5" strokeWidth={2.75} aria-hidden />
              Complete
            </span>
          )}
        </div>

        <div className="relative flex h-8 items-center">
          {/* The bar itself is the progressbar — no interactive children. */}
          <div
            role="progressbar"
            aria-label="Form progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={ariaNow}
            aria-valuetext={
              submitted
                ? "All steps complete"
                : `Step ${Math.min(active + 1, count)} of ${count}`
            }
            className="absolute inset-x-4 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/10"
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${accent}, #ec4899)`,
              }}
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={barSpring}
            />
          </div>

          <ol className="relative z-10 flex w-full items-center justify-between">
            {steps.map((s, i) => {
              const done = i < active || submitted;
              const current = i === active && !submitted;
              const reachable = i < active && !submitted;
              return (
                <li key={s.id} className="relative">
                  <button
                    type="button"
                    onClick={() => handleMarker(i)}
                    disabled={!reachable}
                    aria-current={current ? "step" : undefined}
                    aria-label={`Step ${i + 1} of ${count}${
                      done ? ", completed" : current ? ", current" : ""
                    }`}
                    className={cn(
                      "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold outline-none",
                      !reduce &&
                        "transition-[background-color,color,border-color,box-shadow] duration-300",
                      "focus-visible:ring-2 focus-visible:ring-[var(--pb-msf-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pb-msf-bg)]",
                      reachable
                        ? "cursor-pointer hover:brightness-110"
                        : "cursor-default",
                      done
                        ? "border-transparent text-white"
                        : current
                          ? "text-white"
                          : "border-white/10 bg-white/[0.04] text-white/40"
                    )}
                    style={
                      done
                        ? {
                            background: `linear-gradient(180deg, ${accent}, ${accent}cc)`,
                            boxShadow: `0 6px 16px -8px ${accent}b3`,
                          }
                        : current
                          ? {
                              borderColor: accent,
                              background: `${accent}1f`,
                              boxShadow: `0 0 0 4px ${accent}1a`,
                            }
                          : undefined
                    }
                  >
                    {done ? (
                      <Check className="size-4" strokeWidth={2.75} aria-hidden />
                    ) : (
                      i + 1
                    )}
                  </button>
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute top-full mt-2 hidden max-w-[7.5rem] truncate text-[11px] leading-tight sm:block",
                      i === 0
                        ? "left-0 text-left"
                        : i === count - 1
                          ? "right-0 text-right"
                          : "left-1/2 -translate-x-1/2 text-center",
                      done
                        ? "text-white/65"
                        : current
                          ? "font-medium text-white"
                          : "text-white/35"
                    )}
                  >
                    {s.title}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* Step panel — height morphs; content slides in the travel direction. */}
      {reduce ? (
        <div key={active}>{panelBody}</div>
      ) : (
        <motion.div
          initial={false}
          animate={{ height: height ?? "auto" }}
          transition={heightSpring}
          style={{ overflow: "hidden" }}
        >
          <div ref={measureRef}>
            <AnimatePresence mode="popLayout" custom={direction} initial={false}>
              <motion.div
                key={active}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={spring}
              >
                {panelBody}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Validation error — assertive so it is announced immediately. */}
      {error && (
        <div
          id={errorId}
          role="alert"
          className="mt-4 flex items-start gap-2 text-[13px] font-medium"
          style={{ color: DANGER }}
        >
          <CircleAlert
            className="mt-px size-4 shrink-0"
            strokeWidth={2.25}
            aria-hidden
          />
          <span>{error}</span>
        </div>
      )}

      {/* Footer navigation. */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          disabled={active === 0}
          className={cn(
            "inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5",
            "text-[13px] font-medium text-white/70 outline-none",
            "transition-[color,background-color,opacity] duration-200",
            "hover:bg-white/[0.06] hover:text-white",
            "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/[0.03]",
            "focus-visible:ring-2 focus-visible:ring-[var(--pb-msf-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pb-msf-bg)]",
            active === 0 ? "cursor-not-allowed" : "cursor-pointer"
          )}
        >
          <ArrowLeft className="size-4" strokeWidth={2.25} aria-hidden />
          {backLabel}
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={submitted}
          aria-describedby={error ? errorId : undefined}
          style={{
            background: `linear-gradient(180deg, ${accent}, ${accent}d9)`,
            boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.25), 0 10px 26px -12px ${accent}cc`,
          }}
          className={cn(
            "inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-[13px] font-semibold text-white outline-none",
            "transition-[filter,transform,opacity] duration-200",
            "hover:brightness-110 active:translate-y-px",
            "disabled:cursor-default disabled:opacity-70 disabled:hover:brightness-100 disabled:active:translate-y-0",
            "focus-visible:ring-2 focus-visible:ring-[var(--pb-msf-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pb-msf-bg)]",
            submitted ? "cursor-default" : "cursor-pointer"
          )}
        >
          {submitted ? (
            <>
              Submitted
              <Check className="size-4" strokeWidth={2.75} aria-hidden />
            </>
          ) : isLast ? (
            <>
              {submitLabel}
              <Check className="size-4" strokeWidth={2.5} aria-hidden />
            </>
          ) : (
            <>
              {nextLabel}
              <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default MultiStepForm;
