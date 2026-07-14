"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { ArrowUp, Bot, LoaderCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

/** `useLayoutEffect` on the client, `useEffect` on the server (no SSR warning). */
const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

/**
 * Inject a keyframes stylesheet once, keyed by a stable id so every mounted
 * instance shares a single `<style>`. Never removed — the rules are inert when
 * unreferenced, and re-adding on each mount would thrash `<head>`.
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
@keyframes pb-ai-chat-dot {
  0%, 80%, 100% { transform: translateY(0); opacity: .45; }
  40% { transform: translateY(-3px); opacity: 1; }
}
@keyframes pb-ai-chat-caret { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
@keyframes pb-ai-chat-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .pb-ai-chat-dot, .pb-ai-chat-caret, .pb-ai-chat-spin { animation: none !important; }
}
`;

/** Textarea grows to this height (px) before it starts scrolling in place. */
const MAX_HEIGHT = 160;
/** Floor for the "thinking" dots so a synchronous handler still reads as work. */
const MIN_THINK_MS = 560;
/** Characters revealed per stream tick, and the gap between ticks (ms). */
const STREAM_STEP = 3;
const STREAM_INTERVAL = 22;

export interface AiChatMessage {
  /** Stable identity for React keys and stream targeting. */
  id: string;
  /** Who authored the turn. `user` renders right, `assistant` left. */
  role: "user" | "assistant";
  /** Plain-text body. Newlines are preserved in the bubble. */
  content: string;
}

interface InternalMessage extends AiChatMessage {
  /** Epoch ms, or `null` until stamped from a client effect (SSR-safe). */
  at: number | null;
  /** True while this assistant turn is still being streamed in. */
  streaming: boolean;
}

export interface AiChatProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Seed transcript. Defaults to a short populated conversation. */
  initialMessages?: AiChatMessage[];
  /**
   * Resolve a reply for the user's text. May be sync or async; the returned
   * string is streamed into an assistant bubble. Defaults to a canned echo so
   * the block feels alive with no backend.
   */
  onSend?: (text: string) => Promise<string> | string;
  /** Heading shown in the header. */
  title?: string;
  /** Composer placeholder. */
  placeholder?: string;
  /** Extra classes on the outer card. */
  className?: string;
}

const DEFAULT_MESSAGES: AiChatMessage[] = [
  {
    id: "pb-chat-seed-1",
    role: "assistant",
    content:
      "Hi! I'm your Parable assistant. Ask me anything about installing or composing registry components.",
  },
  {
    id: "pb-chat-seed-2",
    role: "user",
    content: "How do I drop a component into my app?",
  },
  {
    id: "pb-chat-seed-3",
    role: "assistant",
    content:
      "Copy the single file into your ui/ folder, keep the `cn` import, and you're set — every component is self-contained. Want the exact path?",
  },
];

/** Canned, echo-flavoured replies rotated deterministically (no randomness). */
const CANNED_REPLIES: ReadonlyArray<(t: string) => string> = [
  (t) =>
    `Good question about "${t}". The short version: it comes down to a couple of moving parts, and once you see how they fit the rest is straightforward. Want me to break it down step by step?`,
  (t) =>
    `Let me think about "${t}" for a second… The honest answer is yes — with one caveat worth knowing up front. I can walk you through the trade-offs if that's useful.`,
  (t) =>
    `Here's how I'd approach "${t}": start simple, verify each step, then layer on the details. That keeps everything easy to debug and reason about later.`,
];

/** Format an epoch-ms stamp as a short local time, e.g. "9:41 AM". */
function useTimeFormatter() {
  return React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  );
}

/**
 * AiChat — a polished, presentational AI-chat block with no real backend. A
 * scrollable transcript stacks user (right) and assistant (left) bubbles with
 * avatars and timestamps; sending a message shows an animated "typing" dots
 * indicator, then streams the reply in character-chunks via timeouts so it
 * reads like a live model. An auto-growing textarea composer sends on Enter
 * (Shift+Enter inserts a newline, IME composition respected) and disables while
 * a turn is generating. The list sticks to the newest message unless the reader
 * has scrolled up to review history.
 *
 * Real `<form>` / sr-only `<label>` / `<textarea>` semantics; the transcript is
 * a labelled, keyboard-scrollable region and a visually-hidden polite
 * `aria-live` status narrates the stream (typing, then the finished reply once)
 * rather than spamming every chunk. Every control carries a `:focus-visible`
 * ring; decorative layers are `aria-hidden`. Timestamps are stamped from a
 * client effect, so the first client render matches the server (no hydration
 * mismatch) and no `Math.random`/`Date.now` runs during render. Under
 * `prefers-reduced-motion` the dots stop bouncing and replies append whole with
 * no character stream.
 *
 * Colours mirror the site's `--pb-*` tokens (violet #8b5cf6, fuchsia #ec4899,
 * signal #22d3ee, ink #0f0f10).
 *
 * @parable/ai-chat
 */
export function AiChat({
  initialMessages,
  onSend,
  title = "Assistant",
  placeholder = "Send a message…",
  className,
  style,
  ...props
}: AiChatProps) {
  useInjectedKeyframes("pb-ai-chat-kf", KEYFRAMES);
  const reduce = useReducedMotion();
  const timeFmt = useTimeFormatter();

  const reactId = React.useId();
  const uid = reactId.replace(/[^a-zA-Z0-9]/g, "");
  const fieldId = `pb-ai-chat-field-${uid}`;

  const [messages, setMessages] = React.useState<InternalMessage[]>(() =>
    (initialMessages ?? DEFAULT_MESSAGES).map((m) => ({
      ...m,
      at: null,
      streaming: false,
    }))
  );
  const [value, setValue] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [streamingId, setStreamingId] = React.useState<string | null>(null);
  const [live, setLive] = React.useState("");

  const busy = pending || streamingId !== null;

  // Refs the async send/stream flow reads without stale-closure hazards.
  const busyRef = React.useRef(false);
  const stickRef = React.useRef(true);
  const reduceRef = React.useRef(!!reduce);
  reduceRef.current = !!reduce;
  const mountedRef = React.useRef(true);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = React.useRef(0);
  const replyIdxRef = React.useRef(0);

  const listRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const nextId = React.useCallback(
    () => `pb-chat-${uid}-${idRef.current++}`,
    [uid]
  );

  // Stamp seed messages with staggered past times, client-only (SSR-safe).
  React.useEffect(() => {
    const base = Date.now();
    setMessages((prev) =>
      prev.map((m, i) =>
        m.at == null
          ? { ...m, at: base - (prev.length - 1 - i) * 47_000 }
          : m
      )
    );
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Keep the transcript pinned to the newest turn while the reader is at the
  // bottom; leave their scroll position alone if they've scrolled up.
  React.useEffect(() => {
    if (!stickRef.current) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  const onListScroll = React.useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickRef.current = distance < 48;
  }, []);

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

  const defaultReply = React.useCallback((text: string) => {
    const idx = replyIdxRef.current++ % CANNED_REPLIES.length;
    return CANNED_REPLIES[idx](text);
  }, []);
  const respond = onSend ?? defaultReply;

  // Append an assistant turn — streamed char-chunks normally, whole under
  // reduced motion — and release the busy latch when it settles.
  const startStream = React.useCallback(
    (full: string) => {
      const id = nextId();
      const at = Date.now();

      if (reduceRef.current || full.length === 0) {
        setMessages((prev) => [
          ...prev,
          { id, role: "assistant", content: full, at, streaming: false },
        ]);
        setLive(full || "Assistant sent an empty reply.");
        busyRef.current = false;
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id, role: "assistant", content: "", at, streaming: true },
      ]);
      setStreamingId(id);

      let i = 0;
      const tick = () => {
        if (!mountedRef.current) return;
        i = Math.min(full.length, i + STREAM_STEP);
        const slice = full.slice(0, i);
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, content: slice } : m))
        );
        if (i < full.length) {
          timerRef.current = setTimeout(tick, STREAM_INTERVAL);
        } else {
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, streaming: false } : m))
          );
          setStreamingId(null);
          setLive(full);
          busyRef.current = false;
        }
      };
      timerRef.current = setTimeout(tick, STREAM_INTERVAL);
    },
    [nextId]
  );

  const send = React.useCallback(async () => {
    const text = value.trim();
    if (!text || busyRef.current) return;
    busyRef.current = true;

    const userMsg: InternalMessage = {
      id: nextId(),
      role: "user",
      content: text,
      at: Date.now(),
      streaming: false,
    };
    stickRef.current = true;
    setMessages((prev) => [...prev, userMsg]);
    setValue("");
    requestAnimationFrame(() => textareaRef.current?.focus());

    setPending(true);
    setLive("Assistant is typing");

    const started = performance.now();
    let reply: string;
    try {
      reply = String(await respond(text));
    } catch {
      reply = "Sorry — I ran into a problem generating a response.";
    }

    // Give the typing dots a perceptible floor (skipped under reduced motion).
    const floor = reduceRef.current ? 0 : MIN_THINK_MS;
    const remaining = floor - (performance.now() - started);
    if (remaining > 0) {
      await new Promise<void>((res) => {
        timerRef.current = setTimeout(res, remaining);
      });
    }
    if (!mountedRef.current) return;

    setPending(false);
    startStream(reply);
  }, [value, respond, nextId, startStream]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter is a newline; never send mid-IME-composition.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send();
    }
  };

  const canSend = value.trim().length > 0 && !busy;

  const bubbleSpring: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 240, damping: 24, mass: 0.7 };

  return (
    <div
      style={
        {
          "--pb-chat-violet": "#8b5cf6",
          "--pb-chat-fuchsia": "#ec4899",
          "--pb-chat-signal": "#22d3ee",
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        "flex h-[32rem] w-full max-w-md flex-col overflow-hidden rounded-2xl",
        "border border-white/10 bg-[linear-gradient(180deg,#141416,#0f0f10)] text-white",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_24px_48px_-28px_rgba(0,0,0,0.85)]",
        className
      )}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <span
          aria-hidden
          className="relative inline-flex size-9 items-center justify-center rounded-full bg-[var(--pb-chat-violet)]/15 text-[var(--pb-chat-violet)]"
        >
          <Bot className="size-5" strokeWidth={2} />
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#0f0f10] bg-[var(--pb-chat-signal)]" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-tight">
            {title}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-white/45">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-[var(--pb-chat-signal)]"
            />
            Online
          </div>
        </div>
      </div>

      {/* Transcript */}
      <div
        ref={listRef}
        onScroll={onListScroll}
        tabIndex={0}
        role="log"
        aria-label="Conversation"
        aria-live="off"
        className={cn(
          "flex-1 space-y-4 overflow-y-auto px-4 py-4 outline-none",
          "[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent]",
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pb-chat-violet)]/50"
        )}
      >
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <motion.div
              key={m.id}
              layout={reduce ? false : "position"}
              initial={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, y: 8, scale: 0.98 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={bubbleSpring}
              className={cn(
                "flex items-end gap-2",
                isUser ? "flex-row-reverse" : "flex-row"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-full",
                  isUser
                    ? "bg-white/10 text-white/70"
                    : "bg-[var(--pb-chat-violet)]/15 text-[var(--pb-chat-violet)]"
                )}
              >
                {isUser ? (
                  <User className="size-4" strokeWidth={2} />
                ) : (
                  <Bot className="size-4" strokeWidth={2} />
                )}
              </span>

              <div
                className={cn(
                  "flex min-w-0 max-w-[78%] flex-col gap-1",
                  isUser ? "items-end" : "items-start"
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-2 px-1 text-[10.5px] text-white/40",
                    isUser ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <span className="font-medium text-white/55">
                    {isUser ? "You" : title}
                  </span>
                  {m.at != null && (
                    <time
                      dateTime={new Date(m.at).toISOString()}
                      className="tabular-nums"
                    >
                      {timeFmt.format(m.at)}
                    </time>
                  )}
                </div>

                <div
                  aria-hidden={m.streaming ? true : undefined}
                  className={cn(
                    "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed",
                    isUser
                      ? "rounded-br-sm bg-[linear-gradient(135deg,var(--pb-chat-violet),var(--pb-chat-fuchsia))] text-white shadow-[0_8px_20px_-10px_var(--pb-chat-violet)]"
                      : "rounded-bl-sm border border-white/10 bg-white/[0.05] text-zinc-100"
                  )}
                >
                  {m.content}
                  {m.streaming && (
                    <span
                      aria-hidden
                      className="pb-ai-chat-caret ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[0.15em] rounded-full bg-current align-baseline"
                      style={{
                        animation: reduce
                          ? undefined
                          : "pb-ai-chat-caret 1s steps(1) infinite",
                      }}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Typing indicator */}
        <AnimatePresence initial={false}>
          {pending && (
            <motion.div
              key="typing"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
              transition={bubbleSpring}
              className="flex items-end gap-2"
            >
              <span
                aria-hidden
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--pb-chat-violet)]/15 text-[var(--pb-chat-violet)]"
              >
                <Bot className="size-4" strokeWidth={2} />
              </span>
              <div
                aria-hidden
                className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.05] px-3.5 py-3"
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="pb-ai-chat-dot inline-block size-1.5 rounded-full bg-white/60"
                    style={{
                      animation: reduce
                        ? undefined
                        : "pb-ai-chat-dot 1.2s ease-in-out infinite",
                      animationDelay: `${i * 0.16}s`,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="border-t border-white/10 p-3"
      >
        <label htmlFor={fieldId} className="sr-only">
          Message {title}
        </label>
        <div
          className={cn(
            "flex items-end gap-2 rounded-xl border border-white/10 bg-black/25 p-1.5",
            "transition-colors duration-200 focus-within:border-[var(--pb-chat-violet)]/50"
          )}
        >
          <textarea
            id={fieldId}
            ref={textareaRef}
            name="message"
            rows={1}
            value={value}
            placeholder={placeholder}
            enterKeyHint="send"
            aria-label={`Message ${title}`}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            style={{ maxHeight: MAX_HEIGHT }}
            className={cn(
              "min-h-[36px] w-full resize-none bg-transparent px-2.5 py-2",
              "text-[13.5px] leading-relaxed text-white outline-none placeholder:text-white/35"
            )}
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-lg outline-none",
              "transition-[background-color,transform] duration-200 active:scale-95",
              "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f10]",
              "focus-visible:ring-[var(--pb-chat-violet)]",
              canSend
                ? "bg-[var(--pb-chat-violet)] text-white shadow-[0_6px_18px_-6px_var(--pb-chat-violet)] hover:bg-[var(--pb-chat-violet)]/90"
                : "cursor-not-allowed bg-white/10 text-white/35"
            )}
          >
            {busy ? (
              <LoaderCircle
                aria-hidden
                className="pb-ai-chat-spin size-4"
                strokeWidth={2.5}
                style={{
                  animation: reduce
                    ? undefined
                    : "pb-ai-chat-spin 0.8s linear infinite",
                }}
              />
            ) : (
              <ArrowUp aria-hidden className="size-4" strokeWidth={2.75} />
            )}
          </button>
        </div>
      </form>

      {/* Polite status for assistive tech; visually hidden. */}
      <span className="sr-only" role="status" aria-live="polite">
        {live}
      </span>
    </div>
  );
}

export default AiChat;
