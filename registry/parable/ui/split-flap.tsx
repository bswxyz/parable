"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Injects a <style> tag once per unique id (SSR-safe, dedup by id). */
function useInjectedKeyframes(id: string, css: string) {
  React.useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/** Tracks `prefers-reduced-motion: reduce`. Starts false for SSR stability. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

/** space, A–Z, 0–9, then basic punctuation. Order is the flip sequence. */
const DEFAULT_CHARSET =
  " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:'!?-+/@#&%$()";

const SPLIT_FLAP_CSS = `
.pb-sf-cell{position:relative;overflow:hidden;flex:0 0 auto;line-height:1;user-select:none;}
.pb-sf-half{position:absolute;left:0;width:100%;height:50%;overflow:hidden;}
.pb-sf-half.pb-sf-top{top:0;box-shadow:inset 0 1px 0 rgba(255,255,255,.08),inset 0 -1px 2px rgba(0,0,0,.45);}
.pb-sf-half.pb-sf-bottom{bottom:0;box-shadow:inset 0 -1px 0 rgba(0,0,0,.55),inset 0 1px 1px rgba(0,0,0,.35);}
.pb-sf-glyph{position:absolute;left:0;width:100%;height:200%;display:flex;align-items:center;justify-content:center;white-space:nowrap;font-variant-numeric:tabular-nums;letter-spacing:0;}
.pb-sf-anchor-top{top:0;}
.pb-sf-anchor-bottom{bottom:0;}
.pb-sf-flap{position:absolute;left:0;width:100%;height:50%;overflow:hidden;backface-visibility:hidden;z-index:20;will-change:transform;}
.pb-sf-flap-top{top:0;transform-origin:center bottom;box-shadow:inset 0 1px 0 rgba(255,255,255,.08);}
.pb-sf-flap-bottom{bottom:0;transform-origin:center top;transform:rotateX(90deg);box-shadow:inset 0 -1px 0 rgba(0,0,0,.55);}
.pb-sf-seam{position:absolute;left:0;right:0;top:50%;height:1px;transform:translateY(-.5px);background:rgba(0,0,0,.6);z-index:30;pointer-events:none;}
@keyframes pb-split-flap-top{from{transform:rotateX(0deg)}to{transform:rotateX(-90deg)}}
@keyframes pb-split-flap-bottom{from{transform:rotateX(90deg)}to{transform:rotateX(0deg)}}
@media (prefers-reduced-motion:reduce){.pb-sf-flap{display:none!important;animation:none!important}}
`;

function normalizeSet(charSet: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ch of charSet.toUpperCase()) {
    if (!seen.has(ch)) {
      seen.add(ch);
      out.push(ch);
    }
  }
  return out.length ? out : [...DEFAULT_CHARSET];
}

function normalizeText(text: string, set: string[]): string[] {
  const has = new Set(set);
  const blank = has.has(" ") ? " " : set[0];
  return [...text.toUpperCase()].map((ch) => (has.has(ch) ? ch : blank));
}

function Glyph({ char, anchor }: { char: string; anchor: "top" | "bottom" }) {
  return (
    <span
      className={cn(
        "pb-sf-glyph",
        anchor === "top" ? "pb-sf-anchor-top" : "pb-sf-anchor-bottom"
      )}
    >
      {char === " " ? " " : char}
    </span>
  );
}

function Half({
  char,
  edge,
  bg,
}: {
  char: string;
  edge: "top" | "bottom";
  bg: string;
}) {
  return (
    <div
      className={cn(
        "pb-sf-half",
        edge === "top" ? "pb-sf-top" : "pb-sf-bottom"
      )}
      style={{ background: bg }}
    >
      <Glyph char={char} anchor={edge} />
    </div>
  );
}

interface Flip {
  from: number;
  to: number;
  id: number;
}

interface SplitFlapCellProps {
  target: string;
  set: string[];
  speed: number;
  startDelay: number;
  reduced: boolean;
  cellColor: string;
  className?: string;
}

/**
 * A single Solari cell. Steps its displayed character forward through the set
 * (one 3D half-flap per `speed` ms) until it lands on `target`, restarting the
 * flap keyframes each step via a remount `key`. Instant, flapless under reduced
 * motion.
 */
function SplitFlapCell({
  target,
  set,
  speed,
  startDelay,
  reduced,
  cellColor,
  className,
}: SplitFlapCellProps) {
  const len = set.length;
  const targetIndex = React.useMemo(() => {
    const i = set.indexOf(target);
    return i < 0 ? 0 : i;
  }, [set, target]);

  const [index, setIndex] = React.useState(0);
  const [flip, setFlip] = React.useState<Flip | null>(null);
  const indexRef = React.useRef(0);
  const flipId = React.useRef(0);

  React.useEffect(() => {
    if (reduced) {
      indexRef.current = targetIndex;
      setIndex(targetIndex);
      setFlip(null);
      return;
    }
    if (indexRef.current === targetIndex) {
      setFlip(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const phase = Math.max(1, speed / 2);

    const advance = () => {
      if (cancelled) return;
      const cur = indexRef.current;
      if (cur === targetIndex) {
        setFlip(null);
        return;
      }
      const to = (cur + 1) % len;
      flipId.current += 1;
      setFlip({ from: cur, to, id: flipId.current });
      timer = setTimeout(() => {
        if (cancelled) return;
        indexRef.current = to;
        setIndex(to);
        advance();
      }, phase * 2);
    };

    timer = setTimeout(advance, startDelay);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [targetIndex, speed, startDelay, reduced, len]);

  const baseChar = set[index] ?? " ";
  const topStaticChar = flip ? set[flip.to] ?? " " : baseChar;
  const phase = Math.max(1, speed / 2);

  return (
    <div
      className={cn("pb-sf-cell", className)}
      style={{
        width: "0.92em",
        height: "1.32em",
        background: cellColor,
        borderRadius: "0.1em",
        perspective: "5em",
        color: "inherit",
        fontWeight: 700,
        boxShadow:
          "0 1px 2px rgba(0,0,0,.6),0 0 0 1px rgba(255,255,255,.04)",
      }}
    >
      {/* static back layers */}
      <Half char={topStaticChar} edge="top" bg={cellColor} />
      <Half char={baseChar} edge="bottom" bg={cellColor} />

      {/* animated flaps (never rendered under reduced motion) */}
      {flip && !reduced && (
        <React.Fragment key={flip.id}>
          <div
            aria-hidden
            className="pb-sf-flap pb-sf-flap-top"
            style={{
              background: cellColor,
              animation: `pb-split-flap-top ${phase}ms cubic-bezier(.4,0,.9,.6) both`,
            }}
          >
            <Glyph char={set[flip.from] ?? " "} anchor="top" />
          </div>
          <div
            aria-hidden
            className="pb-sf-flap pb-sf-flap-bottom"
            style={{
              background: cellColor,
              animation: `pb-split-flap-bottom ${phase}ms cubic-bezier(.22,1,.36,1) ${phase}ms both`,
            }}
          >
            <Glyph char={set[flip.to] ?? " "} anchor="bottom" />
          </div>
        </React.Fragment>
      )}

      <div className="pb-sf-seam" aria-hidden />
    </div>
  );
}

export interface SplitFlapProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** The string to display. On change, the board animates to the new value. */
  text: string;
  /**
   * Ordered character set the flaps cycle through. Order defines the flip path.
   * Defaults to space + A–Z + 0–9 + basic punctuation.
   */
  charSet?: string;
  /** Milliseconds per single flap (one character advance). */
  speed?: number;
  /** `false` to run once; a number = ms to pause after settling, then re-run. */
  loop?: false | number;
  /** Extra ms of start delay between adjacent cells (left-to-right settle). */
  stagger?: number;
  /** Class applied to each flap cell. */
  cellClassName?: string;
  /** Cell (flap) background. Defaults to Parable ink `--pb-ink`. */
  cellColor?: string;
  /** Glyph colour. Defaults to a warm near-white. */
  textColor?: string;
}

/**
 * SplitFlap — a Solari-board split-flap text display. Each character is a mono,
 * ink-dark cell with a horizontal seam; cells riffle through the character set
 * with a 3D half-flap (CSS perspective + rotateX, injected keyframes) and settle
 * left-to-right with a stagger. Set `loop` to re-run on an interval.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (ink `#0f0f10`). The visual
 * flaps are `aria-hidden`; the container carries `aria-label={text}` plus an
 * `sr-only` copy. Under `prefers-reduced-motion` it renders the final text
 * instantly with no flips.
 *
 * @parable/split-flap
 */
export const SplitFlap = React.forwardRef<HTMLDivElement, SplitFlapProps>(
  function SplitFlap(
    {
      text,
      charSet = DEFAULT_CHARSET,
      speed = 55,
      loop = false,
      stagger = 70,
      className,
      cellClassName,
      cellColor = "#0f0f10",
      textColor = "#f5f5f4",
      style,
      ...props
    },
    ref
  ) {
    useInjectedKeyframes("pb-split-flap-kf", SPLIT_FLAP_CSS);
    const reduced = usePrefersReducedMotion();

    const set = React.useMemo(() => normalizeSet(charSet), [charSet]);
    const chars = React.useMemo(() => normalizeText(text, set), [text, set]);

    // Loop: bump `cycle` to remount the row, resetting every cell to index 0 so
    // the flip-up intro replays. Timed from a reset-from-zero completion model.
    const [cycle, setCycle] = React.useState(0);
    React.useEffect(() => {
      if (loop === false || reduced || chars.length === 0) return;
      let total = 0;
      chars.forEach((c, i) => {
        const flips = Math.max(0, set.indexOf(c));
        total = Math.max(total, i * stagger + flips * speed + speed);
      });
      const t = setTimeout(() => setCycle((c) => c + 1), total + loop);
      return () => clearTimeout(t);
    }, [loop, reduced, chars, set, stagger, speed, cycle]);

    return (
      <div
        ref={ref}
        role="img"
        aria-label={text}
        className={cn(
          "pb-split-flap inline-flex select-none items-center rounded-[0.35em] outline-none",
          "focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
          className
        )}
        style={{ fontFamily: MONO, fontSize: "1.75rem", color: textColor, ...style }}
        {...props}
      >
        <span className="sr-only">{text}</span>
        <div
          key={cycle}
          aria-hidden
          className="inline-flex items-stretch gap-[0.12em]"
        >
          {chars.map((c, i) => (
            <SplitFlapCell
              key={i}
              target={c}
              set={set}
              speed={speed}
              startDelay={i * stagger}
              reduced={reduced}
              cellColor={cellColor}
              className={cellClassName}
            />
          ))}
        </div>
      </div>
    );
  }
);

export default SplitFlap;
