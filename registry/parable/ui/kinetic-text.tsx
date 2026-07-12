"use client";

import * as React from "react";
import { motion, useInView, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

export interface KineticTextProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  /** The text to reveal, split per word. */
  text: string;
  /** Seconds between each word. */
  stagger?: number;
  /** Split unit. */
  by?: "word" | "char";
  /** Only animate once. */
  once?: boolean;
  /** Element to render as. */
  as?: React.ElementType;
}

const container = (stagger: number): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger } },
});

const child: Variants = {
  hidden: { y: "110%", opacity: 0 },
  show: {
    y: "0%",
    opacity: 1,
    transition: { type: "spring", stiffness: 260, damping: 26 },
  },
};

/**
 * KineticText — reveals text word-by-word (or char-by-char) with a spring
 * rise-and-mask as it scrolls into view. Falls back to static, fully-visible
 * text under prefers-reduced-motion.
 *
 * @parable/kinetic-text
 */
export function KineticText({
  text,
  stagger = 0.06,
  by = "word",
  once = true,
  as: Tag = "span",
  className,
  ...props
}: KineticTextProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once, amount: 0.4 });
  const [reduce, setReduce] = React.useState(false);

  React.useEffect(() => {
    setReduce(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }, []);

  const units =
    by === "word" ? text.split(/(\s+)/) : Array.from(text);

  if (reduce) {
    return (
      <Tag className={className} {...props}>
        {text}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref}
      className={cn("inline-block", className)}
      aria-label={text}
      {...props}
    >
      <motion.span
        aria-hidden
        variants={container(stagger)}
        initial="hidden"
        animate={inView ? "show" : "hidden"}
        className="inline-block"
      >
        {units.map((u, i) =>
          /^\s+$/.test(u) ? (
            <span key={i}>{u}</span>
          ) : (
            <span
              key={i}
              className="inline-block overflow-hidden align-bottom"
            >
              <motion.span variants={child} className="inline-block">
                {u}
              </motion.span>
            </span>
          )
        )}
      </motion.span>
    </Tag>
  );
}

export default KineticText;
