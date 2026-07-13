"use client";

import * as React from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Flatten any ReactNode into its plain text content — used both to split the
 * body into words and to build the intact screen-reader copy when the caller
 * passes a string through `children` instead of `text`.
 */
function nodeToText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    return nodeToText(props.children);
  }
  return "";
}

interface WordProps {
  word: string;
  /** Shared 0→1 scroll progress for the whole block. */
  progress: MotionValue<number>;
  /** Progress at which this word begins illuminating. */
  start: number;
  /** Progress at which this word is fully lit. */
  end: number;
  dimColor: string;
  litColor: string;
  reduce: boolean;
}

/**
 * One word rendered as two stacked copies: a permanent dim base (kept legible
 * throughout) and a lit copy on top whose opacity is mapped from the shared
 * scroll progress over this word's [start, end] window. Cross-fading opacity —
 * rather than interpolating between two colour strings — keeps the base always
 * fully painted and avoids any float reaching an inline style.
 */
function Word({
  word,
  progress,
  start,
  end,
  dimColor,
  litColor,
  reduce,
}: WordProps) {
  const opacity = useTransform(progress, [start, end], [0, 1]);
  return (
    <span className="relative inline-block">
      <span style={{ color: dimColor }}>{word}</span>
      <motion.span
        className="absolute inset-0"
        style={{ color: litColor, opacity: reduce ? 1 : opacity }}
      >
        {word}
      </motion.span>
    </span>
  );
}

export interface ScrollTextRevealProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** The copy to reveal. Takes precedence over `children`. */
  text?: string;
  /** Alternative to `text` — pass the sentence as children instead. */
  children?: React.ReactNode;
  /** Element/component to render as. Defaults to `p`. */
  as?: React.ElementType;
  /** Colour of the not-yet-read (dim) layer. Defaults to muted foreground. */
  dimColor?: string;
  /** Colour of the illuminated (lit) layer. Defaults to the foreground. */
  litColor?: string;
  /**
   * Overlap between consecutive words' fade windows. `0` = crisp, strictly
   * sequential; higher softens the sweep so several words light at once.
   */
  stagger?: number;
  /**
   * `useScroll` offset band controlling where in the viewport the reveal runs
   * (e.g. `["start 0.85", "end 0.5"]`). Two edge strings, entry then exit.
   */
  offset?: string[];
}

/**
 * ScrollTextReveal — a block of copy that illuminates word-by-word as it scrolls
 * through the viewport, like a reading highlighter. A single `useScroll` tracks
 * the block's travel through a viewport band and yields one 0→1 progress value;
 * each word maps a slice of that progress to the opacity of a lit copy stacked
 * over a permanent dim copy, so the text is legible at every point and the words
 * cross-fade from muted to foreground in reading order. The `stagger` prop widens
 * each word's window so neighbours overlap instead of snapping; the windows are
 * normalised so the first word starts at progress 0 and the last finishes exactly
 * at 1.
 *
 * The animated layer is `aria-hidden` and a visually-hidden copy of the full
 * sentence carries the accessible text, so screen readers read clean prose. Under
 * `prefers-reduced-motion` every word renders fully lit with no scroll mapping.
 *
 * Colour defaults follow the spec (muted → foreground via `currentColor`, theme-
 * agnostic); pass any CSS colour — e.g. the site's `--pb-*` brand hexes: violet
 * #8b5cf6, fuchsia #ec4899, ember #f5a623, signal #22d3ee on ink #0f0f10.
 *
 * @parable/scroll-text-reveal
 */
export function ScrollTextReveal({
  text,
  children,
  as,
  dimColor = "color-mix(in srgb, currentColor 32%, transparent)",
  litColor = "currentColor",
  stagger = 0.8,
  offset,
  className,
  ...rest
}: ScrollTextRevealProps) {
  const reduce = useReducedMotion() ?? false;
  const ref = React.useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: offset ?? ["start 0.85", "end 0.5"],
  } as Parameters<typeof useScroll>[0]);

  const Component = (as ?? "p") as React.ElementType;

  const source = text ?? "";
  const raw = source || nodeToText(children);
  const trimmed = raw.trim();
  const words = trimmed ? trimmed.split(/\s+/) : [];
  const total = words.length;

  // Windows sized so word 0 starts at progress 0 and the last word finishes
  // exactly at 1, with a k/denom overlap so adjacent words cross-fade.
  const k = Math.max(0, stagger);
  const denom = total + k;

  const content =
    total > 0 ? (
      <>
        <span className="sr-only">{raw}</span>
        <span aria-hidden="true">
          {words.map((word, i) => (
            <React.Fragment key={i}>
              <Word
                word={word}
                progress={scrollYProgress}
                start={i / denom}
                end={(i + 1 + k) / denom}
                dimColor={dimColor}
                litColor={litColor}
                reduce={reduce}
              />
              {i < total - 1 ? " " : null}
            </React.Fragment>
          ))}
        </span>
      </>
    ) : (
      children
    );

  return (
    <Component ref={ref} className={cn(className)} {...rest}>
      {content}
    </Component>
  );
}

export default ScrollTextReveal;
