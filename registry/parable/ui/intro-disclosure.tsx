"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Runs layout effects on the client, plain effects on the server (no SSR warning). */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/**
 * Controllable state helper (bool or number) with a stable setter. Also exposes
 * the raw internal setter and whether the value is controlled, so callers can
 * reset uncontrolled state without firing `onChange`.
 */
function useControllableState<T>(
  controlled: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void
) {
  const [uncontrolled, setUncontrolled] = React.useState<T>(defaultValue);
  const isControlled = controlled !== undefined;
  const value = isControlled ? (controlled as T) : uncontrolled;
  const setValue = React.useCallback(
    (next: T) => {
      if (!isControlled) setUncontrolled(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );
  return [value, setValue, setUncontrolled, isControlled] as const;
}

/**
 * Inject a `<style>` block once per unique id — the only place raw CSS
 * keyframes are defined, so they can't collide across multiple mounts.
 */
function useInjectedKeyframes(id: string, css: string) {
  useIsoLayoutEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }, [id, css]);
}

const KF_ID = "pb-intro-disclosure-kf";
const KEYFRAMES = `
@keyframes pb-intro-disclosure-sheen {
  from { background-position: 0% 0; }
  to { background-position: 200% 0; }
}
.pb-intro-disclosure-sheen {
  animation: pb-intro-disclosure-sheen 8s ease-in-out infinite alternate;
}
@media (prefers-reduced-motion: reduce) {
  .pb-intro-disclosure-sheen { animation: none; }
}
`;

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
      el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement
  );
}

function clampIndex(value: number, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(value, 0), count - 1);
}

export interface IntroStep {
  /** Step heading — labels the dialog while this step is shown. */
  title: React.ReactNode;
  /** Step body copy — describes the dialog while this step is shown. */
  body: React.ReactNode;
  /** Optional media (image, illustration, icon) shown above the title. */
  media?: React.ReactNode;
}

export interface IntroDisclosureProps
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
  /** Ordered steps the tour walks through. */
  steps: IntroStep[];
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean;
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean;
  /** Fires with the next open state on Skip, Escape, backdrop, or completion. */
  onOpenChange?: (open: boolean) => void;
  /** Controlled active step index. Pair with `onStepChange`. */
  step?: number;
  /** Uncontrolled initial step index. */
  defaultStep?: number;
  /** Fires with the next step index on Back / Next / dot navigation. */
  onStepChange?: (step: number) => void;
  /** Fires when the primary button is pressed on the final step. */
  onComplete?: () => void;
  /** Accent hex — primary button, active dot, focus ring. Mirrors `--pb-violet`. */
  accent?: string;
  /** Card surface colour. Mirrors the site `--pb-ink` token. */
  background?: string;
  /** Label for the advance button on non-final steps. */
  nextLabel?: React.ReactNode;
  /** Label for the back button. */
  backLabel?: React.ReactNode;
  /** Label for the dismiss button. */
  skipLabel?: React.ReactNode;
  /** Label for the primary button on the final step. */
  doneLabel?: React.ReactNode;
  /** Extra classes on the dialog card. */
  className?: string;
}

/**
 * IntroDisclosure — a first-run onboarding sequence: a stepped dialog card that
 * walks through features one panel at a time. Each step carries a title, body,
 * and optional media; Back / Next advance it while a clickable progress-dots row
 * shows position and jumps to any step, and Skip (or Escape) dismisses the tour.
 * Steps cross-fade and slide in the travel direction — forward slides in from
 * the right, Back from the left — while the card's height springs to fit the
 * incoming content, so panels of different sizes morph without a jump.
 *
 * Works controlled (`open` + `step`) or uncontrolled (`defaultOpen` + internal
 * step state) with `onOpenChange` / `onStepChange` / `onComplete`. It is a real
 * `role="dialog"` with `aria-modal`: focus is moved in on open, Tab is trapped,
 * Escape skips, and focus returns to the opener on close. The overlay fills its
 * nearest positioned ancestor (`position: absolute; inset: 0`) — wrap it in a
 * `relative` box, or a `fixed inset-0` layer for a full-screen tour.
 *
 * Under `prefers-reduced-motion` the slide, blur, and height morph are dropped
 * and steps swap instantly. Colour defaults mirror the site's `--pb-*` tokens
 * (accent violet `#8b5cf6` on ink `#0f0f10`; the top sheen blends fuchsia
 * `#ec4899` and signal `#22d3ee`).
 *
 * @parable/intro-disclosure
 */
export function IntroDisclosure({
  steps,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  step: stepProp,
  defaultStep = 0,
  onStepChange,
  onComplete,
  accent = "#8b5cf6",
  background = "#0f0f10",
  nextLabel = "Next",
  backLabel = "Back",
  skipLabel = "Skip",
  doneLabel = "Get started",
  className,
  style,
  ...props
}: IntroDisclosureProps) {
  const reduce = useReducedMotion() ?? false;
  useInjectedKeyframes(KF_ID, KEYFRAMES);

  const count = steps.length;

  const [open, setOpen] = useControllableState<boolean>(
    openProp,
    defaultOpen,
    onOpenChange
  );
  const [stepRaw, setStep, setStepRaw, stepIsControlled] =
    useControllableState<number>(stepProp, defaultStep, onStepChange);

  const active = clampIndex(stepRaw, count);

  const uid = React.useId();
  const titleId = `pb-id-title-${uid}-${active}`;
  const descId = `pb-id-desc-${uid}-${active}`;

  const panelRef = React.useRef<HTMLDivElement>(null);
  const measureRef = React.useRef<HTMLDivElement>(null);

  // Travel direction is derived from the delta versus the previously rendered
  // step, so it is correct whether navigation came from our buttons or from a
  // controlled `step` prop change.
  const prevStepRef = React.useRef(active);
  const direction = active >= prevStepRef.current ? 1 : -1;
  React.useEffect(() => {
    prevStepRef.current = active;
  }, [active]);

  // Measured natural height of the current step; springs on every content swap.
  const [height, setHeight] = React.useState<number | null>(null);
  useIsoLayoutEffect(() => {
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

  const skip = React.useCallback(() => setOpen(false), [setOpen]);

  const goTo = (next: number) => setStep(clampIndex(next, count));
  const handleBack = () => {
    if (active > 0) goTo(active - 1);
  };
  const handleNext = () => {
    if (active >= count - 1) {
      onComplete?.();
      setOpen(false);
    } else {
      goTo(active + 1);
    }
  };

  // Modal lifecycle: focus in, Tab trap, Escape to skip, focus returned on close.
  React.useEffect(() => {
    if (!open || count === 0) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      (getFocusable(panel)[0] ?? panel)?.focus({ preventScroll: true });
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        skip();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      const items = getFocusable(panel);
      if (items.length === 0) {
        e.preventDefault();
        panel?.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey) {
        if (activeEl === first || !panel?.contains(activeEl)) {
          e.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else if (activeEl === last || !panel?.contains(activeEl)) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    };
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown, true);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open, count, skip]);

  const panelSpring: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 240, damping: 26, mass: 0.9 };
  const heightSpring: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 220, damping: 26, mass: 0.8 };
  const stepTransition: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 240, damping: 26, mass: 0.9 };
  const backdropTransition: Transition = reduce
    ? { duration: 0 }
    : { duration: 0.26, ease: [0.22, 1, 0.36, 1] };

  const stepVariants: Variants = {
    enter: (dir: number) =>
      reduce
        ? { opacity: 1, x: 0, filter: "blur(0px)" }
        : { opacity: 0, x: dir >= 0 ? 28 : -28, filter: "blur(6px)" },
    center: { opacity: 1, x: 0, filter: "blur(0px)" },
    exit: (dir: number) =>
      reduce
        ? { opacity: 0, x: 0, filter: "blur(0px)" }
        : { opacity: 0, x: dir >= 0 ? -28 : 28, filter: "blur(6px)" },
  };

  const vars = {
    "--pb-id-accent": accent,
    "--pb-id-bg": background,
  } as React.CSSProperties;

  const activeStep = count > 0 ? steps[active] : undefined;
  const isLast = active >= count - 1;

  return (
    <AnimatePresence
      onExitComplete={() => {
        if (!stepIsControlled) setStepRaw(clampIndex(defaultStep, count));
      }}
    >
      {open && count > 0 && activeStep && (
        <motion.div
          key="pb-id-overlay"
          className="absolute inset-0 z-50 flex items-center justify-center p-4"
          style={vars}
        >
          {/* Backdrop — click to skip. Decorative. */}
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={backdropTransition}
            onClick={skip}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            tabIndex={-1}
            style={{ ...vars, ...style }}
            className={cn(
              "relative flex max-h-[calc(100%-1rem)] w-[min(24rem,100%)] flex-col",
              "overflow-hidden rounded-2xl border border-white/10 text-white outline-none",
              "bg-[var(--pb-id-bg)] shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85)]",
              "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]",
              className
            )}
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: 10 }
            }
            animate={
              reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }
            }
            exit={
              reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }
            }
            transition={panelSpring}
            {...props}
          >
            {/* Top gradient sheen — decorative brand accent. */}
            <span
              aria-hidden
              className="pb-intro-disclosure-sheen pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${accent}, #ec4899, #22d3ee, transparent)`,
                backgroundSize: "200% 100%",
              }}
            />

            {/* Header: step counter + skip. */}
            <div className="flex shrink-0 items-center justify-between gap-3 px-6 pt-5">
              <span className="text-xs font-medium tracking-wide text-white/45">
                Step {active + 1} of {count}
              </span>
              <button
                type="button"
                onClick={skip}
                className={cn(
                  "-mr-2 rounded-lg px-2 py-1 text-xs font-medium text-white/50",
                  "cursor-pointer outline-none transition-colors duration-200",
                  "hover:text-white/80",
                  "focus-visible:ring-2 focus-visible:ring-[var(--pb-id-accent)]",
                  "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pb-id-bg)]"
                )}
              >
                {skipLabel}
              </button>
            </div>

            {/* Morph region: springs its height to the incoming step. */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <motion.div
                initial={false}
                animate={{ height: height ?? "auto" }}
                transition={heightSpring}
                style={{ overflow: "hidden" }}
              >
                <div ref={measureRef} className="relative px-6 pb-5 pt-4">
                  <AnimatePresence
                    mode="popLayout"
                    custom={direction}
                    initial={false}
                  >
                    <motion.div
                      key={active}
                      custom={direction}
                      variants={stepVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={stepTransition}
                    >
                      {activeStep.media != null && (
                        <div
                          className={cn(
                            "mb-4 overflow-hidden rounded-xl border border-white/10",
                            "bg-white/[0.03]",
                            "[&_img]:block [&_img]:h-full [&_img]:w-full [&_img]:object-cover",
                            "[&_svg]:size-8"
                          )}
                        >
                          {activeStep.media}
                        </div>
                      )}
                      <h2
                        id={titleId}
                        className="text-base font-semibold tracking-tight text-white"
                      >
                        {activeStep.title}
                      </h2>
                      <div
                        id={descId}
                        className="mt-1.5 text-[13px] leading-relaxed text-white/60"
                      >
                        {activeStep.body}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>

            {/* Footer: progress dots + Back / Next. */}
            <div className="flex shrink-0 items-center justify-between gap-4 px-6 pb-5 pt-1">
              <div
                role="group"
                aria-label="Onboarding progress"
                className="flex items-center gap-1"
              >
                {steps.map((_, i) => {
                  const isActive = i === active;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => goTo(i)}
                      aria-label={`Go to step ${i + 1}`}
                      aria-current={isActive ? "step" : undefined}
                      className={cn(
                        "group/dot flex items-center justify-center px-0.5 py-2",
                        "cursor-pointer rounded-md outline-none",
                        "focus-visible:ring-2 focus-visible:ring-[var(--pb-id-accent)]",
                        "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pb-id-bg)]"
                      )}
                    >
                      <span
                        className="h-1.5 rounded-full"
                        style={{
                          width: isActive ? 20 : 6,
                          backgroundColor: isActive
                            ? accent
                            : "rgba(255,255,255,0.22)",
                          transition: reduce
                            ? undefined
                            : "width .35s cubic-bezier(.22,1,.36,1), background-color .35s cubic-bezier(.22,1,.36,1)",
                        }}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={active === 0}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-xl px-3",
                    "text-[13px] font-medium text-white/70",
                    "border border-white/10 bg-white/[0.03]",
                    "cursor-pointer outline-none transition-[color,background-color,opacity] duration-200",
                    "hover:bg-white/[0.06] hover:text-white",
                    "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/[0.03]",
                    "focus-visible:ring-2 focus-visible:ring-[var(--pb-id-accent)]",
                    "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pb-id-bg)]"
                  )}
                >
                  <ArrowLeft className="size-4" strokeWidth={2.25} aria-hidden />
                  {backLabel}
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  style={{
                    background: `linear-gradient(180deg, ${accent}, ${accent}d9)`,
                    boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.25), 0 8px 22px -10px ${accent}b3`,
                  }}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5",
                    "text-[13px] font-semibold text-white",
                    "cursor-pointer outline-none transition-[filter,transform] duration-200",
                    "hover:brightness-110 active:translate-y-px",
                    "focus-visible:ring-2 focus-visible:ring-[var(--pb-id-accent)]",
                    "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pb-id-bg)]"
                  )}
                >
                  {isLast ? doneLabel : nextLabel}
                  {isLast ? (
                    <Check className="size-4" strokeWidth={2.5} aria-hidden />
                  ) : (
                    <ArrowRight
                      className="size-4"
                      strokeWidth={2.25}
                      aria-hidden
                    />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default IntroDisclosure;
