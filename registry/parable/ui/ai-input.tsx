"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { ArrowUp, ChevronDown, LoaderCircle, Paperclip, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/** `useLayoutEffect` on the client, `useEffect` on the server (no SSR warning). */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/**
 * Inject a keyframes stylesheet once, keyed by a stable id so multiple mounted
 * instances share a single `<style>`. Never removed — the rules are inert when
 * unreferenced and re-adding on every mount would thrash the head.
 */
function useInjectedKeyframes(id: string, css: string): void {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

const KEYFRAMES = `
@keyframes pb-ai-input-spin { to { transform: rotate(360deg); } }
@keyframes pb-ai-input-glow {
  0%, 100% { opacity: 0.42; }
  50% { opacity: 0.78; }
}
`;

/** Textarea grows to this height (px) before it starts scrolling internally. */
const MAX_HEIGHT = 208;
/** Floor for the pending spinner so a fast/sync submit still reads as work. */
const MIN_PENDING_MS = 620;

export interface AiInputProps {
  /** Placeholder shown while the composer is empty. */
  placeholder?: string;
  /** Optional prompt chips shown above the input while it is empty; clicking one fills the field. */
  suggestions?: string[];
  /** Called with the trimmed text on submit. If it returns a promise, the spinner holds until it settles. */
  onSubmit?: (text: string) => void | Promise<void>;
  /** Label shown on the leading model pill (decorative in this demo composer). */
  model?: string;
  /** Extra classes on the outer `<form>`. */
  className?: string;
}

/**
 * AiInput — a polished AI chat composer in the Vercel-AI-SDK genre. An
 * auto-growing textarea climbs with its content up to a max, then scrolls in
 * place; a leading row carries a model pill and an attach affordance; a trailing
 * send button is disabled while empty and swaps to a brief pending spinner on
 * submit (padded to a visible floor so even a synchronous handler registers).
 * Focus lights a soft, slowly-pulsing accent glow behind the surface. An
 * optional row of suggestion chips springs in above the field while it is empty
 * and fills it on click.
 *
 * Real `<form>` / sr-only `<label>` / `<textarea>` semantics: Enter submits,
 * Shift+Enter inserts a newline (IME composition is respected), and a polite
 * `aria-live` region announces the sending state. Every interactive control has
 * a `:focus-visible` ring; decorative layers are `aria-hidden`. Under
 * `prefers-reduced-motion` the glow pulse, spinner rotation, and chip/icon
 * transitions all resolve to instant, legible static states.
 *
 * Colours mirror the site's `--pb-*` tokens (violet #8b5cf6, fuchsia #ec4899,
 * signal #22d3ee, ink #0f0f10).
 *
 * @parable/ai-input
 */
export function AiInput({
  placeholder = "Ask anything…",
  suggestions = [],
  onSubmit,
  model = "Auto",
  className,
}: AiInputProps) {
  useInjectedKeyframes("pb-ai-input-kf", KEYFRAMES);
  const reduce = useReducedMotion();

  const [value, setValue] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reactId = React.useId();
  const fieldId = `pb-ai-input-${reactId}`;

  const canSend = value.trim().length > 0 && !pending;
  const showChips = suggestions.length > 0 && value.trim().length === 0 && !pending;

  // Auto-grow: reset to content height, then clamp; scroll only past the cap.
  const resize = React.useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const next = Math.min(ta.scrollHeight, MAX_HEIGHT);
    ta.style.height = `${next}px`;
    ta.style.overflowY = ta.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }, []);

  useIsoLayoutEffect(() => {
    resize();
  }, [value, resize]);

  React.useEffect(() => {
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  const submit = React.useCallback(async () => {
    const text = value.trim();
    if (!text || pending) return;

    setPending(true);
    const started = performance.now();
    let ok = false;
    try {
      await onSubmit?.(text);
      ok = true;
    } catch {
      ok = false;
    }

    // Hold the spinner to a perceptible minimum, even for instant handlers.
    const remaining = MIN_PENDING_MS - (performance.now() - started);
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, remaining));
    }
    if (!mountedRef.current) return;

    setPending(false);
    if (ok) {
      setValue("");
      // Keep the cursor in the field for a fluid multi-message flow.
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [value, pending, onSubmit]);

  const applySuggestion = React.useCallback((text: string) => {
    setValue(text);
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      const end = ta.value.length;
      ta.setSelectionRange(end, end);
    });
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter is a newline; never send mid-IME-composition.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  };

  const spring: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 240, damping: 22, mass: 0.7 };

  const chipList: Variants = {
    hidden: {},
    shown: {
      transition: reduce ? { duration: 0 } : { staggerChildren: 0.05 },
    },
  };
  const chipItem: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.96 },
    shown: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: reduce
        ? { duration: 0 }
        : { type: "spring", stiffness: 260, damping: 24 },
    },
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      style={
        {
          "--pb-ai-violet": "#8b5cf6",
          "--pb-ai-fuchsia": "#ec4899",
          "--pb-ai-signal": "#22d3ee",
        } as React.CSSProperties
      }
      className={cn("relative w-full text-white", className)}
    >
      <label htmlFor={fieldId} className="sr-only">
        Message
      </label>

      {/* Suggestion chips — shown only while the field is empty. */}
      <AnimatePresence initial={false}>
        {showChips && (
          <motion.div
            role="group"
            aria-label="Suggested prompts"
            variants={chipList}
            initial="hidden"
            animate="shown"
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            transition={spring}
            className="mb-2 flex flex-wrap gap-2"
          >
            {suggestions.map((text) => (
              <motion.button
                key={text}
                type="button"
                variants={chipItem}
                onClick={() => applySuggestion(text)}
                whileHover={reduce ? undefined : { y: -1 }}
                whileTap={reduce ? undefined : { scale: 0.97 }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
                  "border border-white/10 bg-white/[0.03] text-xs text-white/70",
                  "outline-none transition-colors duration-200",
                  "hover:border-white/20 hover:bg-white/[0.06] hover:text-white",
                  "focus-visible:ring-2 focus-visible:ring-[var(--pb-ai-violet)] focus-visible:ring-offset-0"
                )}
              >
                <Sparkles
                  aria-hidden
                  className="size-3.5 text-[var(--pb-ai-violet)]"
                  strokeWidth={2.25}
                />
                <span className="truncate">{text}</span>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Composer + focus glow. */}
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-2 rounded-3xl blur-xl"
          style={{
            background:
              "linear-gradient(120deg, var(--pb-ai-violet), var(--pb-ai-fuchsia) 55%, var(--pb-ai-signal))",
            opacity: focused ? 0.6 : 0,
            transition: "opacity 320ms cubic-bezier(.22,1,.36,1)",
            animation:
              focused && !reduce
                ? "pb-ai-input-glow 3.2s ease-in-out infinite"
                : undefined,
          }}
        />

        <div
          data-focused={focused}
          className={cn(
            "relative flex flex-col rounded-2xl border border-white/10",
            "bg-[#0f0f10]/80 backdrop-blur-sm shadow-[0_10px_34px_-14px_rgba(0,0,0,0.7)]",
            "transition-colors duration-300",
            "data-[focused=true]:border-[var(--pb-ai-violet)]/45"
          )}
        >
          <textarea
            id={fieldId}
            ref={textareaRef}
            name="message"
            rows={1}
            value={value}
            placeholder={placeholder}
            readOnly={pending}
            enterKeyHint="send"
            aria-label="Message"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{ maxHeight: MAX_HEIGHT }}
            className={cn(
              "w-full resize-none bg-transparent px-4 pt-3.5 pb-1",
              "text-[15px] leading-relaxed text-white outline-none",
              "placeholder:text-white/35",
              "min-h-[24px]"
            )}
          />

          <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-1.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label={`Model: ${model}`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5",
                  "text-xs font-medium text-white/70",
                  "outline-none transition-colors duration-200",
                  "hover:bg-white/[0.06] hover:text-white",
                  "focus-visible:ring-2 focus-visible:ring-[var(--pb-ai-violet)]"
                )}
              >
                <Sparkles
                  aria-hidden
                  className="size-4 text-[var(--pb-ai-violet)]"
                  strokeWidth={2.25}
                />
                <span className="max-w-[10rem] truncate">{model}</span>
                <ChevronDown aria-hidden className="size-3.5 text-white/40" strokeWidth={2.5} />
              </button>

              <button
                type="button"
                aria-label="Attach files"
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-lg",
                  "text-white/55 outline-none transition-colors duration-200",
                  "hover:bg-white/[0.06] hover:text-white",
                  "focus-visible:ring-2 focus-visible:ring-[var(--pb-ai-violet)]"
                )}
              >
                <Paperclip aria-hidden className="size-4" strokeWidth={2.25} />
              </button>
            </div>

            <motion.button
              type="submit"
              disabled={!canSend}
              aria-label="Send message"
              whileHover={reduce || !canSend ? undefined : { scale: 1.06 }}
              whileTap={reduce || !canSend ? undefined : { scale: 0.92 }}
              transition={spring}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-xl",
                "outline-none transition-colors duration-200",
                "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f10]",
                "focus-visible:ring-[var(--pb-ai-violet)]",
                canSend
                  ? "bg-[var(--pb-ai-violet)] text-white shadow-[0_6px_18px_-6px_var(--pb-ai-violet)] hover:bg-[var(--pb-ai-violet)]/90"
                  : "cursor-not-allowed bg-white/10 text-white/35"
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                {pending ? (
                  <motion.span
                    key="pending"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.14 }}
                    className="flex"
                  >
                    <LoaderCircle
                      aria-hidden
                      className="size-4"
                      strokeWidth={2.5}
                      style={{
                        animation: reduce
                          ? undefined
                          : "pb-ai-input-spin 0.8s linear infinite",
                      }}
                    />
                  </motion.span>
                ) : (
                  <motion.span
                    key="send"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.14 }}
                    className="flex"
                  >
                    <ArrowUp aria-hidden className="size-4" strokeWidth={2.75} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Polite status for assistive tech; visually hidden. */}
      <span className="sr-only" role="status" aria-live="polite">
        {pending ? "Sending message" : ""}
      </span>
    </form>
  );
}

export default AiInput;
