"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** First+last initial (or first two letters of a single name); deterministic. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface HoverMember {
  /** Full name — the always-visible label and part of the accessible name. */
  name: string;
  /** Title / role — slides into the preview on hover or focus. */
  role: string;
  /** Image URL, or any node (initials fall back when omitted). Decorative. */
  avatar?: string | React.ReactNode;
  /** Optional one- or two-line blurb revealed under the role. */
  bio?: string;
  /** When set the row renders as an anchor; otherwise it is a button. */
  href?: string;
}

export interface HoverMemberRowProps
  extends Omit<React.HTMLAttributes<HTMLUListElement>, "onSelect"> {
  /** The people to list. Each becomes one focusable row. */
  members: HoverMember[];
  /** Primary accent (bar, role text, arrow, focus ring). Mirrors `--pb-violet`. */
  accent?: string;
  /** Secondary accent the drawing bar fades toward. Mirrors `--pb-fuchsia`. */
  accentTo?: string;
  /** Fires with the picked member and its index on click / activation. */
  onSelect?: (member: HoverMember, index: number) => void;
}

/**
 * HoverMemberRow — a roster where pointing at (or keyboard-focusing) a row
 * lifts it into a rich preview: the avatar swells, an accent bar draws down the
 * left edge, the role and bio slide open, a corner arrow eases in, and the
 * other rows dim back so the active person reads as the subject. Hover and
 * focus drive the exact same state, so tabbing through the list mirrors the
 * mouse; hover always wins when both are present. Each row is a real anchor
 * (when `href` is given) or button, carrying a complete `aria-label`
 * (name, role, bio) so the visual reveal never gates what assistive tech hears,
 * and the decorative layers are `aria-hidden`.
 *
 * Under `prefers-reduced-motion` every transform is dropped — no dim, slide, or
 * scale — and the preview simply cross-fades in via opacity, staying fully
 * legible. Colour defaults mirror the site's `--pb-*` tokens
 * (accent = violet #8b5cf6, accentTo = fuchsia #ec4899).
 *
 * @parable/hover-member-row
 */
export function HoverMemberRow({
  members,
  accent = "#8b5cf6",
  accentTo = "#ec4899",
  onSelect,
  className,
  style,
  ...props
}: HoverMemberRowProps) {
  const reduce = useReducedMotion();
  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);
  const [focusIndex, setFocusIndex] = React.useState<number | null>(null);

  // Pointer takes precedence over the keyboard when both are engaged.
  const active = hoverIndex !== null ? hoverIndex : focusIndex;

  const spring: Transition = {
    type: "spring",
    stiffness: 240,
    damping: 22,
    mass: 0.7,
  };
  const springHeight: Transition = {
    type: "spring",
    stiffness: 220,
    damping: 26,
    mass: 0.9,
  };
  const fade: Transition = { duration: 0.18, ease: [0.22, 1, 0.36, 1] };

  return (
    <ul
      role="list"
      onPointerLeave={() => setHoverIndex(null)}
      style={
        {
          "--pb-hmr-accent": accent,
          "--pb-hmr-accent-2": accentTo,
          ...style,
        } as React.CSSProperties
      }
      className={cn("flex w-full flex-col gap-1", className)}
      {...props}
    >
      {members.map((member, i) => {
        const isActive = active === i;
        const isDimmed = !reduce && active !== null && !isActive;
        const Comp: React.ElementType = member.href ? "a" : "button";

        return (
          <motion.li
            key={`${member.name}-${i}`}
            className="relative"
            animate={{ opacity: isDimmed ? 0.45 : 1 }}
            transition={reduce ? { duration: 0 } : fade}
          >
            <Comp
              {...(member.href
                ? { href: member.href }
                : { type: "button" as const })}
              onClick={() => onSelect?.(member, i)}
              onPointerEnter={() => setHoverIndex(i)}
              onFocus={() => setFocusIndex(i)}
              onBlur={() =>
                setFocusIndex((prev) => (prev === i ? null : prev))
              }
              data-active={isActive}
              aria-label={`${member.name}, ${member.role}${
                member.bio ? `. ${member.bio}` : ""
              }`}
              className={cn(
                "group/row relative flex w-full items-center gap-4 rounded-2xl py-3 pl-5 pr-3 text-left",
                "cursor-pointer no-underline outline-none transition-colors duration-300",
                "text-white hover:bg-white/[0.03] data-[active=true]:bg-white/[0.04]",
                "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pb-hmr-accent)]"
              )}
            >
              {/* Accent bar — draws down the left edge on activation. */}
              <motion.span
                aria-hidden
                className="pointer-events-none absolute left-1 top-2 bottom-2 w-[3px] rounded-full"
                style={{
                  background:
                    "linear-gradient(180deg, var(--pb-hmr-accent), var(--pb-hmr-accent-2))",
                  transformOrigin: "top",
                }}
                animate={
                  reduce
                    ? { opacity: isActive ? 1 : 0 }
                    : { scaleY: isActive ? 1 : 0, opacity: isActive ? 1 : 0 }
                }
                transition={reduce ? fade : spring}
              />

              {/* Avatar — swells and gains an accent ring when active. */}
              <motion.span
                aria-hidden
                className={cn(
                  "relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full",
                  "bg-white/[0.06] text-sm font-semibold text-white/80 ring-1 ring-white/10",
                  "transition-shadow duration-300",
                  "data-[active=true]:ring-2 data-[active=true]:ring-[var(--pb-hmr-accent)]",
                  "data-[active=true]:shadow-[0_0_22px_-6px_var(--pb-hmr-accent)]",
                  "[&_img]:h-full [&_img]:w-full [&_img]:object-cover"
                )}
                data-active={isActive}
                animate={{ scale: reduce ? 1 : isActive ? 1.09 : 1 }}
                transition={reduce ? { duration: 0 } : spring}
              >
                {typeof member.avatar === "string" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.avatar} alt="" />
                ) : member.avatar ? (
                  member.avatar
                ) : (
                  <span>{initialsOf(member.name)}</span>
                )}
              </motion.span>

              {/* Name (always shown) + role/bio preview (revealed). */}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">
                  {member.name}
                </span>

                <AnimatePresence initial={false}>
                  {isActive && (member.role || member.bio) && (
                    <motion.span
                      key="preview"
                      aria-hidden
                      className="block overflow-hidden"
                      initial={
                        reduce
                          ? { opacity: 0 }
                          : { opacity: 0, height: 0, x: -8 }
                      }
                      animate={
                        reduce
                          ? { opacity: 1 }
                          : { opacity: 1, height: "auto", x: 0 }
                      }
                      exit={
                        reduce
                          ? { opacity: 0 }
                          : { opacity: 0, height: 0, x: -8 }
                      }
                      transition={reduce ? fade : springHeight}
                    >
                      {member.role && (
                        <span className="mt-1 block truncate text-xs font-medium text-[var(--pb-hmr-accent)]">
                          {member.role}
                        </span>
                      )}
                      {member.bio && (
                        <span className="mt-0.5 block text-xs leading-relaxed text-white/55 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                          {member.bio}
                        </span>
                      )}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>

              {/* Corner arrow — eases in to signal the row is actionable. */}
              <motion.span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-lg text-[var(--pb-hmr-accent)]"
                animate={
                  reduce
                    ? { opacity: isActive ? 1 : 0 }
                    : { opacity: isActive ? 1 : 0, x: isActive ? 0 : -6 }
                }
                transition={reduce ? fade : spring}
              >
                <ArrowUpRight className="size-4" strokeWidth={2.25} />
              </motion.span>
            </Comp>
          </motion.li>
        );
      })}
    </ul>
  );
}

export default HoverMemberRow;
