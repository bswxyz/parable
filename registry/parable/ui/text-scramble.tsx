"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Live subscription to `prefers-reduced-motion`. Mirrors the site helper. */
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

/** Glyph pool the decode draws random characters from before each cell locks. */
const DEFAULT_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!<>-_\\/[]{}=+*^?#";

/** ms between successive characters locking (before the `speed` divisor). */
const STEP_MS = 34;
/** ms of scramble lead before the first character settles. */
const TAIL_MS = 260;
/** ms between glyph re-rolls — a flicker cadence, not a per-frame strobe. */
const FLICKER_MS = 44;

/** cubic-bezier(.22,1,.36,1)-style ease-out for the reveal cursor. */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const isSpace = (c: string): boolean =>
  c === " " || c === "\n" || c === "\t" || c === "\u00A0";

/** One rendered cell: `on` marks a glyph still scrambling (accent-tinted). */
type Cell = { ch: string; on: boolean };

const buildFinal = (s: string): Cell[] =>
  Array.from(s).map((ch) => ({ ch, on: false }));

export interface TextScrambleProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** The string that resolves out of the glyph noise. */
  text: string;
  /**
   * When the decode fires. `"view"` plays once on scroll-in, `"mount"` plays
   * once after hydration, `"hover"` replays on each pointer-enter / focus.
   */
  trigger?: "mount" | "view" | "hover";
  /** Speed multiplier — 2 runs twice as fast, 0.5 half. */
  speed?: number;
  /** Characters the scramble draws from. */
  scrambleChars?: string;
  /** Tint for characters still scrambling; they settle to the inherited color. Mirrors `--pb-cyan`. */
  color?: string;
  /** Element to render as. Defaults to `span`. */
  as?: React.ElementType;
}

/**
 * TextScramble — a decode effect: the final string resolves out of random
 * glyphs left-to-right, each cell flickering through a short scramble tail
 * before it locks, tinted with a brand accent until it settles to the
 * inherited color. Driven by a single rAF loop with an eased reveal cursor
 * (cubic-bezier(.22,1,.36,1)-style) and a throttled glyph flicker, not a
 * per-frame strobe. `trigger` selects mount / in-view (IntersectionObserver) /
 * hover replay.
 *
 * SSR-safe by construction: the first paint is the final text, and scrambling
 * only begins inside a mount effect — no hydration mismatch, no `Math.random`
 * during render. An invisible sizer layer holds the box at the final width so
 * the reveal never reflows its surroundings. A visually-hidden layer always
 * carries the final text for assistive tech; the animated layer is
 * `aria-hidden`. Under `prefers-reduced-motion` it renders the final text
 * statically with no scramble.
 *
 * Accent default (signal cyan #22d3ee) mirrors the site's `--pb-*` tokens.
 *
 * @parable/text-scramble
 */
export function TextScramble({
  text,
  trigger = "view",
  speed = 1,
  scrambleChars = DEFAULT_CHARS,
  color = "#22d3ee",
  as: Tag = "span",
  className,
  onPointerEnter,
  onFocus,
  ...props
}: TextScrambleProps) {
  const reduce = usePrefersReducedMotion();
  const rootRef = React.useRef<HTMLElement>(null);

  // 0 = idle (final text shown). Bumping it (re-)plays the decode.
  const [runId, setRunId] = React.useState(0);
  const [display, setDisplay] = React.useState<Cell[]>(() => buildFinal(text));

  // Keep the resting state in sync if the text changes while idle.
  React.useEffect(() => {
    setDisplay(buildFinal(text));
  }, [text]);

  // trigger === "mount": fire once after hydration.
  React.useEffect(() => {
    if (trigger === "mount" && !reduce) setRunId((r) => r + 1);
  }, [trigger, reduce]);

  // trigger === "view": fire once when scrolled into view.
  React.useEffect(() => {
    if (trigger !== "view" || reduce) return;
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRunId((r) => r + 1);
          io.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [trigger, reduce]);

  // The decode loop. Re-runs (restarts) whenever runId or the inputs change.
  React.useEffect(() => {
    if (reduce || runId === 0) return;

    const chars = Array.from(text);
    const n = chars.length;
    if (n === 0) return;

    const glyphs = scrambleChars.length > 0 ? scrambleChars : DEFAULT_CHARS;
    const pick = () => glyphs.charAt((Math.random() * glyphs.length) | 0);

    const speedF = Math.max(0.1, speed);
    const stepMs = STEP_MS / speedF;
    const tailMs = TAIL_MS / speedF;
    const total = Math.max(tailMs, (n - 1) * stepMs + tailMs);

    const rolled = chars.map((ch) => (isSpace(ch) ? ch : pick()));

    // Paint the fully-scrambled state immediately so the trigger reads instantly.
    setDisplay(
      chars.map((ch, i) =>
        isSpace(ch) ? { ch, on: false } : { ch: rolled[i], on: true }
      )
    );

    let raf = 0;
    let start = 0;
    let lastFlicker = -1;
    let sig = "";

    const tick = (now: number) => {
      if (!start) start = now;
      const t = now - start;
      const done = t >= total;
      const cursor = easeOut(Math.min(1, t / total)) * n;

      const fstep = Math.floor(t / FLICKER_MS);
      const flick = fstep !== lastFlicker;
      if (flick) lastFlicker = fstep;

      const out: Cell[] = new Array(n);
      for (let i = 0; i < n; i++) {
        const ch = chars[i];
        if (isSpace(ch)) {
          out[i] = { ch, on: false };
          continue;
        }
        if (done || cursor >= i + 1) {
          out[i] = { ch, on: false };
        } else {
          if (flick) rolled[i] = pick();
          out[i] = { ch: rolled[i], on: true };
        }
      }

      // Only re-render when the visible frame actually changed.
      let nextSig = "";
      for (let i = 0; i < n; i++) nextSig += out[i].ch + (out[i].on ? "1" : "0");
      if (nextSig !== sig) {
        sig = nextSig;
        setDisplay(out);
      }

      if (done) return;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [runId, text, speed, scrambleChars, reduce]);

  // Static, fully legible fallback — no layers, no scramble.
  if (reduce) {
    return (
      <Tag
        className={className}
        onPointerEnter={onPointerEnter}
        onFocus={onFocus}
        {...props}
      >
        {text}
      </Tag>
    );
  }

  const replay = trigger === "hover";
  const handleEnter = (e: React.PointerEvent<HTMLElement>) => {
    onPointerEnter?.(e);
    if (replay) setRunId((r) => r + 1);
  };
  const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
    onFocus?.(e);
    if (replay) setRunId((r) => r + 1);
  };

  return (
    <Tag
      ref={rootRef}
      className={cn(
        "relative inline-block align-baseline",
        replay &&
          "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--pb-ts-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        className
      )}
      style={{ "--pb-ts-color": color } as React.CSSProperties}
      onPointerEnter={handleEnter}
      onFocus={handleFocus}
      {...props}
    >
      {/* Assistive tech reads (and copies) exactly the final text, once. */}
      <span className="sr-only">{text}</span>

      {/* Invisible sizer: holds the box at the final width so nothing reflows. */}
      <span aria-hidden className="invisible select-none">
        {text}
      </span>

      {/* Decorative animated layer, overlaid on the sizer. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 select-none whitespace-pre-wrap"
      >
        {display.map((cell, i) => (
          <span
            key={i}
            style={{
              color: cell.on ? color : undefined,
              transitionProperty: "color",
              transitionDuration: cell.on ? "0ms" : "260ms",
              transitionTimingFunction: "cubic-bezier(.22,1,.36,1)",
            }}
          >
            {cell.ch}
          </span>
        ))}
      </span>
    </Tag>
  );
}

export default TextScramble;
