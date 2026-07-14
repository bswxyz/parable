"use client";

import * as React from "react";
import { Check } from "lucide-react";
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

/** Clamp `n` into the inclusive `[lo, hi]` range. */
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/**
 * All motion is CSS-driven, so the reduced-motion fallback lives entirely in the
 * injected stylesheet: the connector fills snap to their final scale with no
 * grow, and the current-step pulse ring is suppressed, leaving the solid accent
 * ring as a static, legible marker.
 */
const STEPPER_KEYFRAMES =
  ".pb-stepper-fill-x{transform:scaleX(0);transform-origin:left center}" +
  ".pb-stepper-fill-x.is-on{animation:pb-stepper-grow-x .6s cubic-bezier(.22,1,.36,1) forwards}" +
  ".pb-stepper-fill-y{transform:scaleY(0);transform-origin:top center}" +
  ".pb-stepper-fill-y.is-on{animation:pb-stepper-grow-y .6s cubic-bezier(.22,1,.36,1) forwards}" +
  ".pb-stepper-ping{opacity:0;animation:pb-stepper-ping 1.9s cubic-bezier(.22,1,.36,1) infinite}" +
  ".pb-stepper-pop{animation:pb-stepper-pop .45s cubic-bezier(.22,1,.36,1)}" +
  "@keyframes pb-stepper-grow-x{to{transform:scaleX(1)}}" +
  "@keyframes pb-stepper-grow-y{to{transform:scaleY(1)}}" +
  "@keyframes pb-stepper-ping{0%{transform:scale(1);opacity:.5}80%{transform:scale(2.05);opacity:0}100%{transform:scale(2.05);opacity:0}}" +
  "@keyframes pb-stepper-pop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:1}}" +
  "@media (prefers-reduced-motion:reduce){" +
  ".pb-stepper-fill-x,.pb-stepper-fill-y{animation:none!important}" +
  ".pb-stepper-fill-x.is-on{transform:scaleX(1)}" +
  ".pb-stepper-fill-y.is-on{transform:scaleY(1)}" +
  ".pb-stepper-ping{animation:none!important;opacity:0}" +
  ".pb-stepper-pop{animation:none!important}}";

type StepStatus = "complete" | "current" | "upcoming";

export interface StepperStep {
  /** Primary label rendered beside/under the circle. */
  label: string;
  /** Optional secondary line of supporting text. */
  description?: string;
}

export interface StepperProps
  extends Omit<React.HTMLAttributes<HTMLOListElement>, "onClick"> {
  /** Ordered steps to render. */
  steps: StepperStep[];
  /**
   * Index of the active step. Steps before it read as complete, this one as
   * current, later ones as upcoming. Pass `steps.length` to mark all complete.
   */
  current: number;
  /** Layout axis. Defaults to `"horizontal"`. */
  orientation?: "horizontal" | "vertical";
  /**
   * When provided, completed and current steps become keyboard-operable
   * buttons that fire with their index; upcoming steps stay inert.
   */
  onStepClick?: (index: number) => void;
  /**
   * Accent used for fills, checks and the current ring. Defaults to Parable
   * violet `#8b5cf6` (mirrors the site `--pb-violet` token).
   */
  accent?: string;
}

/**
 * Stepper — a horizontal or vertical progress stepper (display, or an optional
 * controller when `onStepClick` is passed). Numbered circles connect via a track
 * whose accent fill grows in across the segments between completed steps; a past
 * step reads as a filled check, the current step as an accent ring with a soft
 * pulse, and upcoming steps as muted outlines. Pass `onStepClick` to turn
 * completed and current steps into keyboard-operable buttons (upcoming steps stay
 * inert). The fill grow and the current-step pulse are pure CSS keyframes injected
 * once under a unique id; under `prefers-reduced-motion` the fills snap in with no
 * grow and the pulse is suppressed, leaving a solid, legible ring. Rendered as an
 * ordered `role="list"` with `aria-current="step"` on the active item.
 *
 * Accent defaults to Parable violet `#8b5cf6` (mirrors the site `--pb-violet`
 * token); the wider palette maps to `--pb-*` (fuchsia #ec4899, ember #f5a623,
 * signal #22d3ee, ink #0f0f10).
 *
 * @parable/stepper
 */
export function Stepper({
  steps,
  current,
  orientation = "horizontal",
  onStepClick,
  accent = "#8b5cf6",
  className,
  ...props
}: StepperProps) {
  useInjectedKeyframes("pb-stepper-kf", STEPPER_KEYFRAMES);

  const horizontal = orientation === "horizontal";
  const n = steps.length;
  // Allow `current === n` (everything complete) while keeping indices sane.
  const cur = clamp(current, -1, n);

  const statusOf = (i: number): StepStatus =>
    i < cur ? "complete" : i === cur ? "current" : "upcoming";

  return (
    <ol
      role="list"
      className={cn(
        "flex w-full list-none p-0",
        horizontal ? "flex-row items-start" : "flex-col",
        className
      )}
      {...props}
    >
      {steps.map((step, i) => {
        const status = statusOf(i);
        const isComplete = status === "complete";
        const isCurrent = status === "current";
        const hasConnector = i < n - 1;
        // The segment leading out of a completed step is filled.
        const connectorOn = i < cur;
        // Completed and current steps are actionable when a handler is supplied.
        const interactive = !!onStepClick && i <= cur;

        const circle = (
          <span
            aria-hidden
            data-status={status}
            className="relative z-10 h-10 w-10 shrink-0"
          >
            {isCurrent && (
              <span
                aria-hidden
                className="pb-stepper-ping pointer-events-none absolute inset-0 rounded-full"
                style={{ border: `2px solid ${accent}` }}
              />
            )}
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors duration-300",
                status === "upcoming" &&
                  "border border-white/15 bg-white/[0.02] text-zinc-500",
                (isComplete || isCurrent) &&
                  (interactive ? "group-hover:brightness-110" : "")
              )}
              style={
                isComplete
                  ? { background: accent, color: "#0f0f10" }
                  : isCurrent
                    ? {
                        background: `${accent}22`,
                        color: accent,
                        boxShadow: `0 0 0 2px ${accent}`,
                      }
                    : undefined
              }
            >
              {isComplete ? (
                <Check
                  size={18}
                  strokeWidth={3}
                  aria-hidden
                  className="pb-stepper-pop"
                />
              ) : (
                <span>{i + 1}</span>
              )}
            </span>
          </span>
        );

        const text = (
          <span
            className={cn(
              "flex min-w-0 flex-col",
              horizontal ? "mt-3 items-center text-center" : "pt-1.5 text-left"
            )}
          >
            <span
              className={cn(
                "text-sm font-medium leading-tight",
                status === "upcoming" ? "text-zinc-500" : "text-zinc-100"
              )}
            >
              {step.label}
            </span>
            {step.description && (
              <span
                className={cn(
                  "mt-0.5 text-xs leading-snug",
                  status === "upcoming" ? "text-zinc-600" : "text-zinc-400"
                )}
              >
                {step.description}
              </span>
            )}
          </span>
        );

        const wrapperClass = cn(
          "group flex rounded-xl outline-none",
          horizontal
            ? "w-full flex-col items-center px-1"
            : "w-full items-start gap-3.5 text-left",
          interactive
            ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f10]"
            : "cursor-default"
        );

        const inner = (
          <>
            {circle}
            {text}
          </>
        );

        return (
          <li
            key={i}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              "relative",
              horizontal ? "flex-1" : hasConnector && "pb-8"
            )}
          >
            {hasConnector && (
              <span
                aria-hidden
                className={cn(
                  "absolute rounded-full",
                  horizontal
                    ? "left-1/2 top-5 h-0.5 w-full -translate-y-1/2"
                    : "left-5 top-5 h-full w-0.5 -translate-x-1/2"
                )}
              >
                <span className="absolute inset-0 rounded-full bg-white/[0.09]" />
                <span
                  className={cn(
                    "absolute inset-0 rounded-full",
                    horizontal ? "pb-stepper-fill-x" : "pb-stepper-fill-y",
                    connectorOn && "is-on"
                  )}
                  style={{ background: accent }}
                />
              </span>
            )}

            {interactive ? (
              <button
                type="button"
                onClick={() => onStepClick?.(i)}
                className={wrapperClass}
                aria-label={`Go to step ${i + 1} of ${n}: ${step.label}${
                  isComplete ? " (completed)" : " (current)"
                }`}
              >
                {inner}
              </button>
            ) : (
              <div className={wrapperClass}>{inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default Stepper;
