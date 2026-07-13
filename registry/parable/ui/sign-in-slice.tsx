"use client";

import * as React from "react";
import {
  motion,
  AnimatePresence,
  useAnimationControls,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { ArrowRight, GitBranch, Globe, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** Injects a keyframes/style block once, keyed by a unique id. */
function useInjectedKeyframes(id: string, css: string) {
  React.useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/** Where the email flow currently is. */
type SignInPhase = "idle" | "submitting" | "success";

/** Good-enough email shape check for a demo slice (not RFC 5322). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface SignInSliceProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title" | "onSubmit" | "children"> {
  /**
   * Runs when a valid email is submitted. Resolve to show the success state,
   * throw/reject to fall back to the form with an error hint. Defaults to a
   * fake ~1.2s delay so the slice demos itself.
   */
  onSubmit?: (email: string) => Promise<void> | void;
  /** Card heading. */
  title?: React.ReactNode;
  /** One-liner under the heading. */
  subtitle?: React.ReactNode;
  /** Logo slot above the heading. Defaults to a small violet gradient tile. */
  logo?: React.ReactNode;
  /** Mono fine-print line at the foot of the card. */
  finePrint?: React.ReactNode;
  /** Accent hex — button, floated label, success check. Default Parable violet. */
  accent?: string;
  /** Called when an OAuth-style button is pressed (demo-grade, no real auth). */
  onOAuth?: (provider: "github" | "google") => void;
}

/**
 * SignInSlice — a complete, drop-in sign-in card (demo-grade, no real auth):
 * logo slot, floating-label email input whose label springs up on focus/fill
 * (stiffness 260 / damping 20), a continue button that runs an inline progress
 * sheen while `onSubmit` resolves (default: fake ~1.2s), then morphs the form
 * into a drawn success check + "Check your inbox" panel. Two OAuth-style
 * buttons and a mono fine-print line round out the slice.
 *
 * Semantics are real: a `<form>` with `<label htmlFor>`, `aria-invalid` +
 * described-by error hint, a polite `role="status"` live region announcing
 * "sending" and "sent", and `:focus-visible` rings on every control. Invalid
 * emails get a velocity-kicked spring shake plus a red hint. Under
 * `prefers-reduced-motion` the shake, sheen, and label spring are dropped and
 * all state swaps are instant.
 *
 * Colours default to the Parable palette (accent violet `#8b5cf6` on ink
 * `#0f0f10`), mirroring the site's `--pb-*` tokens; `accent` must be a 6-digit
 * hex (alpha suffixes are derived from it).
 *
 * @parable/sign-in-slice
 */
export function SignInSlice({
  onSubmit,
  title = "Sign in to Parable",
  subtitle = "We'll email you a magic link. No password needed.",
  logo,
  finePrint = "By continuing you agree to the Terms · Privacy",
  accent = "#8b5cf6",
  onOAuth,
  className,
  style,
  ...props
}: SignInSliceProps) {
  const reduce = useReducedMotion() ?? false;

  useInjectedKeyframes(
    "pb-sign-in-slice-kf",
    "@keyframes pb-sis-sheen{from{transform:translateX(-100%)}to{transform:translateX(100%)}}" +
      ".pb-sis-sheen{animation:pb-sis-sheen 1.1s cubic-bezier(.45,0,.25,1) infinite}" +
      "@media (prefers-reduced-motion:reduce){.pb-sis-sheen{animation:none!important;display:none}}"
  );

  const uid = React.useId();
  const inputId = `pb-sis-email-${uid}`;
  const hintId = `pb-sis-hint-${uid}`;

  const [phase, setPhase] = React.useState<SignInPhase>("idle");
  const [email, setEmail] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Velocity-kicked spring around x=0 — reads as a shake, settles on its own.
  const fieldControls = useAnimationControls();
  const shake = React.useCallback(() => {
    if (reduce) return;
    void fieldControls.start({
      x: 0,
      transition: { type: "spring", stiffness: 260, damping: 9, velocity: 1400 },
    });
  }, [fieldControls, reduce]);

  const submitting = phase === "submitting";
  const floated = focused || email.length > 0;

  const defaultSubmit = React.useCallback(
    () => new Promise<void>((resolve) => setTimeout(resolve, 1200)),
    []
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("Enter a valid email address.");
      shake();
      inputRef.current?.focus();
      return;
    }
    setError(null);
    setPhase("submitting");
    try {
      await (onSubmit ?? defaultSubmit)(value);
      if (mountedRef.current) setPhase("success");
    } catch {
      if (!mountedRef.current) return;
      setPhase("idle");
      setError("Something went wrong — try again.");
      shake();
    }
  };

  // "Use a different email" → back to the form, refocus once it has re-entered.
  const wantsFocusRef = React.useRef(false);
  const reset = () => {
    wantsFocusRef.current = true;
    setPhase("idle");
  };

  const swapTransition: Transition = reduce
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] };
  const labelSpring: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 260, damping: 20 };
  const popSpring: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 220, damping: 18 };

  const statusMessage =
    phase === "submitting"
      ? "Sending your magic link."
      : phase === "success"
        ? `Magic link sent to ${email.trim()}. Check your inbox.`
        : "";

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f10]";

  return (
    <div
      className={cn(
        "relative w-full max-w-sm rounded-2xl p-6 text-white sm:p-7",
        "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_0_0_rgba(255,255,255,0.06),0_24px_60px_-24px_rgba(0,0,0,0.8)]",
        className
      )}
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0) 42%), #0f0f10",
        ...({ "--pb-sis-accent": accent } as React.CSSProperties),
        ...style,
      }}
      {...props}
    >
      {/* Logo slot */}
      <div className="mb-5 flex justify-center">
        {logo ?? (
          <span
            aria-hidden
            className="grid size-10 place-items-center rounded-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25)]"
            style={{ background: `linear-gradient(135deg, ${accent}, #ec4899)` }}
          >
            <Sparkles className="size-5 text-white" />
          </span>
        )}
      </div>

      <h2 className="text-center text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1.5 text-center text-[13px] leading-relaxed text-white/50">
        {subtitle}
      </p>

      {/* Screen-reader announcements for the flow's state changes. */}
      <span role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </span>

      <div className="mt-6 min-h-[128px]">
        <AnimatePresence mode="wait" initial={false}>
          {phase === "success" ? (
            <motion.div
              key="success"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={swapTransition}
              className="flex flex-col items-center text-center"
            >
              <motion.span
                initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={popSpring}
                className="grid size-14 place-items-center rounded-full"
                style={{
                  background: `${accent}1f`,
                  boxShadow: `inset 0 0 0 1px ${accent}59`,
                }}
                aria-hidden
              >
                <svg viewBox="0 0 24 24" fill="none" className="size-7">
                  <motion.path
                    d="M5 12.5l4.3 4.3L19 7.3"
                    stroke={accent}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={reduce ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.12 }
                    }
                  />
                </svg>
              </motion.span>
              <h3 className="mt-3.5 text-[15px] font-semibold tracking-tight">
                Check your inbox
              </h3>
              <p className="mt-1 text-[13px] text-white/50">
                We sent a magic link to{" "}
                <span className="font-medium text-white/85">{email.trim()}</span>
              </p>
              <button
                type="button"
                onClick={reset}
                className={cn(
                  "mt-3 rounded-md px-1 py-0.5 text-[13px] font-medium text-white/70",
                  "underline-offset-4 transition-colors hover:text-white hover:underline",
                  focusRing
                )}
              >
                Use a different email
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              noValidate
              onSubmit={handleSubmit}
              aria-busy={submitting}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={swapTransition}
              onAnimationComplete={() => {
                if (wantsFocusRef.current) {
                  wantsFocusRef.current = false;
                  inputRef.current?.focus();
                }
              }}
            >
              {/* Floating-label email field (spring-shaken on invalid submit). */}
              <motion.div animate={fieldControls} className="relative">
                <input
                  ref={inputRef}
                  id={inputId}
                  name="email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  disabled={submitting}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? hintId : undefined}
                  className={cn(
                    "h-12 w-full rounded-xl bg-white/[0.04] px-3.5 pt-3.5 text-[15px] text-white",
                    "caret-[var(--pb-sis-accent)] outline-none transition-shadow duration-200",
                    "disabled:opacity-60",
                    error
                      ? "shadow-[inset_0_0_0_1.5px_rgba(251,113,133,0.75)]"
                      : "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] focus:shadow-[inset_0_0_0_1.5px_var(--pb-sis-accent)]"
                  )}
                />
                <motion.label
                  htmlFor={inputId}
                  initial={false}
                  animate={{
                    y: floated ? -9 : 0,
                    scale: floated ? 0.72 : 1,
                    color: error
                      ? "#fb7185"
                      : floated
                        ? accent
                        : "rgba(255,255,255,0.45)",
                  }}
                  transition={labelSpring}
                  className="pointer-events-none absolute left-3.5 top-[14px] origin-left text-[15px] leading-5"
                >
                  Email address
                </motion.label>
              </motion.div>

              <AnimatePresence initial={false}>
                {error && (
                  <motion.p
                    id={hintId}
                    role="alert"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={
                      reduce ? { duration: 0 } : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
                    }
                    className="mt-1.5 text-[12px] font-medium text-[#fb7185]"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "relative mt-3 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl",
                  "text-sm font-semibold text-white transition-[filter,transform] duration-200",
                  "hover:brightness-110 active:translate-y-px disabled:cursor-wait",
                  focusRing
                )}
                style={{
                  background: `linear-gradient(180deg, ${accent}, ${accent}d9)`,
                  boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.25), 0 8px 24px -10px ${accent}b3`,
                }}
              >
                {/* Inline progress sheen while onSubmit resolves. */}
                {submitting && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
                  >
                    <span
                      className="pb-sis-sheen absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(105deg, transparent 25%, rgba(255,255,255,0.35) 50%, transparent 75%)",
                      }}
                    />
                  </span>
                )}
                <AnimatePresence mode="wait" initial={false}>
                  {submitting ? (
                    <motion.span
                      key="sending"
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                      transition={swapTransition}
                      className="relative z-10"
                    >
                      Sending link…
                    </motion.span>
                  ) : (
                    <motion.span
                      key="cta"
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                      transition={swapTransition}
                      className="relative z-10 flex items-center gap-2"
                    >
                      Continue with email
                      <ArrowRight className="size-4" aria-hidden />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Divider */}
      <div aria-hidden className="mt-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] uppercase tracking-widest text-white/35">or</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      {/* OAuth-style buttons (demo-grade) */}
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => onOAuth?.("github")}
          className={cn(
            "flex h-11 items-center justify-center gap-2 rounded-xl bg-white/[0.04] text-[13px] font-medium text-white/80",
            "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] transition-colors duration-200",
            "hover:bg-white/[0.08] hover:text-white active:translate-y-px",
            focusRing
          )}
        >
          <GitBranch className="size-4" aria-hidden />
          GitHub
        </button>
        <button
          type="button"
          onClick={() => onOAuth?.("google")}
          className={cn(
            "flex h-11 items-center justify-center gap-2 rounded-xl bg-white/[0.04] text-[13px] font-medium text-white/80",
            "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] transition-colors duration-200",
            "hover:bg-white/[0.08] hover:text-white active:translate-y-px",
            focusRing
          )}
        >
          <Globe className="size-4" aria-hidden />
          Google
        </button>
      </div>

      {/* Mono fine print */}
      <p className="mt-5 text-center font-mono text-[10px] tracking-wide text-white/30">
        {finePrint}
      </p>
    </div>
  );
}

export default SignInSlice;
