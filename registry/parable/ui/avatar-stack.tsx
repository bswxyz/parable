"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** SSR-safe reduced-motion hook: false on the server and first client paint. */
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

export interface AvatarStackPerson {
  name: string;
  /** Image URL. Falls back to colored initials when omitted or on load error. */
  src?: string;
  /** Fallback disc colour. Defaults to a deterministic pick from the palette. */
  color?: string;
}

export interface AvatarStackProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClick"> {
  people: AvatarStackPerson[];
  /** How many avatars to show before collapsing into a "+N" chip. */
  max?: number;
  /** Avatar diameter in px. */
  size?: number;
  onPersonClick?: (person: AvatarStackPerson, index: number) => void;
}

/* Deterministic palette pick — mirrors the site's --pb-* tokens. */
const FALLBACK_COLORS = ["#8b5cf6", "#ec4899", "#f5a623", "#22d3ee"];

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * AvatarStack — an overlapping avatar group. Hovering or keyboard-focusing an
 * avatar lifts it and reveals a name tooltip while its neighbours part
 * slightly; anyone past `max` collapses into a "+N" chip. Images fall back to
 * deterministic colored initials, so the group renders identically on server
 * and client. Under prefers-reduced-motion the lift and parting are dropped —
 * the tooltip still appears on hover/focus.
 *
 * @parable/avatar-stack
 */
export function AvatarStack({
  people,
  max = 5,
  size = 40,
  onPersonClick,
  className,
  ...props
}: AvatarStackProps) {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = React.useState<number | null>(null);
  const [broken, setBroken] = React.useState<ReadonlySet<number>>(new Set());

  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;
  const overlap = Math.round(size * 0.3);
  const ease = "cubic-bezier(.22,1,.36,1)";

  function transformFor(i: number): string {
    if (reduced || active === null) return "none";
    if (i === active) return "translateY(-6px) scale(1.08)";
    if (i === active - 1) return "translateX(-4px)";
    if (i === active + 1) return "translateX(4px)";
    return "none";
  }

  return (
    <div
      role="group"
      aria-label={`${people.length} people`}
      className={cn("flex items-center pt-8", className)}
      {...props}
    >
      {visible.map((person, i) => {
        const showImage = person.src && !broken.has(i);
        const disc = person.color ?? colorFor(person.name);
        return (
          <button
            key={`${person.name}-${i}`}
            type="button"
            aria-label={person.name}
            onClick={() => onPersonClick?.(person, i)}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive((a) => (a === i ? null : a))}
            onFocus={() => setActive(i)}
            onBlur={() => setActive((a) => (a === i ? null : a))}
            className={cn(
              "relative rounded-full outline-none",
              "focus-visible:ring-2 focus-visible:ring-[#8b5cf6] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              onPersonClick ? "cursor-pointer" : "cursor-default"
            )}
            style={{
              width: size,
              height: size,
              marginLeft: i === 0 ? 0 : -overlap,
              zIndex: active === i ? visible.length + 1 : i + 1,
              transform: transformFor(i),
              transition: reduced ? "none" : `transform 300ms ${ease}`,
            }}
          >
            {/* name bubble */}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap",
                "rounded-md border bg-popover px-2 py-0.5 font-mono text-[11px] text-popover-foreground shadow-sm",
                active === i ? "opacity-100" : "opacity-0"
              )}
              style={{
                transition: reduced ? "none" : `opacity 200ms ${ease}`,
              }}
            >
              {person.name}
            </span>

            {showImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={person.src}
                alt=""
                width={size}
                height={size}
                onError={() =>
                  setBroken((prev) => new Set(prev).add(i))
                }
                className="size-full rounded-full object-cover ring-2 ring-background"
              />
            ) : (
              <span
                aria-hidden
                className="grid size-full select-none place-items-center rounded-full font-medium text-white ring-2 ring-background"
                style={{ background: disc, fontSize: Math.round(size * 0.36) }}
              >
                {initialsFor(person.name)}
              </span>
            )}
          </button>
        );
      })}

      {overflow > 0 && (
        <span
          aria-label={`${overflow} more`}
          className="grid select-none place-items-center rounded-full bg-muted font-mono text-muted-foreground ring-2 ring-background"
          style={{
            width: size,
            height: size,
            marginLeft: -overlap,
            fontSize: Math.round(size * 0.3),
            zIndex: 0,
          }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}

export default AvatarStack;
