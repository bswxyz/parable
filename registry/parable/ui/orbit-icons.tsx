"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Inject a `<style>` block exactly once per document, keyed by a unique id.
 * Runs from an effect so it never touches the SSR markup — the server and the
 * first client render produce identical DOM, and the keyframes attach after.
 */
function useInjectedKeyframes(id: string, css: string) {
  React.useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/** Round a float to 3 decimals — full-precision floats trip React hydration. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

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

/** Brand palette cycled per ring. Mirrors the site `--pb-*` tokens. */
const PB_PALETTE = ["#8b5cf6", "#ec4899", "#f5a623", "#22d3ee"] as const;

const KEYFRAMES = `
@keyframes pb-orbit-icons-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .pb-orbit-icons [data-orbit-spin] { animation: none !important; }
}
.pb-orbit-icons[data-pause-on-hover="true"]:hover [data-orbit-spin],
.pb-orbit-icons[data-pause-on-hover="true"]:focus-within [data-orbit-spin] {
  animation-play-state: paused;
}`;

/** A single concentric orbit ring. */
export interface OrbitRing {
  /** Icon chips spread evenly around this ring (decorative `ReactNode`s). */
  icons: React.ReactNode[];
  /** Orbit radius in px. Defaults to a widening `92 + index * 60`. */
  radius?: number;
  /** Seconds for one full revolution. Defaults to `22 + index * 6`. */
  duration?: number;
  /** Reverse the spin direction. Defaults to alternating per ring index. */
  reverse?: boolean;
}

export interface OrbitIconsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Centerpiece — e.g. a logo — rendered above the rings, dead center. */
  children?: React.ReactNode;
  /** 1–3 concentric rings, each carrying evenly-spaced revolving icon chips. */
  rings: OrbitRing[];
  /** Freeze all rotation while the pointer is over (or focus is within). */
  pauseOnHover?: boolean;
}

interface ResolvedRing {
  icons: React.ReactNode[];
  radius: number;
  duration: number;
  reverse: boolean;
  accent: string;
}

/** Fill each ring's optional fields deterministically — no `Math.random()`. */
function resolveRings(rings: OrbitRing[]): ResolvedRing[] {
  return rings.map((ring, i) => ({
    icons: ring.icons,
    radius: ring.radius ?? 92 + i * 60,
    duration: ring.duration ?? 22 + i * 6,
    reverse: ring.reverse ?? i % 2 === 1,
    accent: PB_PALETTE[i % PB_PALETTE.length],
  }));
}

const CHIP_SIZE = 44; // px — the diameter of one orbiting icon chip

/**
 * OrbitIcons — a centerpiece encircled by 1–3 concentric dashed orbit rings,
 * each carrying evenly-spaced icon chips that revolve continuously. The motion
 * is pure CSS: each ring is a centered square that spins on a single linear
 * `rotate` keyframe (adjacent rings alternate direction and speed), so every
 * chip on a ring shares one animation while a deterministic per-chip angle
 * (`360° / n · i`) spreads them out. Each chip counter-rotates on the mirror
 * animation — same duration, opposite direction — so the icons stay upright as
 * they orbit. Spacing and geometry are computed from the props alone, so the
 * server and first client render match exactly. Under `prefers-reduced-motion`
 * every ring freezes at its initial, still-legible arrangement. The rings and
 * chips are `aria-hidden` decoration; the centerpiece renders above them in a
 * relative `z-10` layer.
 *
 * Ring accents cycle the brand palette — violet #8b5cf6, fuchsia #ec4899,
 * ember #f5a623, signal #22d3ee on ink #0f0f10 — mirroring the `--pb-*` tokens.
 *
 * @parable/orbit-icons
 */
export function OrbitIcons({
  children,
  rings,
  pauseOnHover = false,
  className,
  style,
  ...props
}: OrbitIconsProps) {
  useInjectedKeyframes("pb-orbit-icons-kf", KEYFRAMES);
  const reduced = usePrefersReducedMotion();

  const resolved = React.useMemo(() => resolveRings(rings), [rings]);

  // Square the box to the widest orbit plus a chip's overhang.
  const maxRadius = resolved.reduce((m, r) => Math.max(m, r.radius), 0);
  const box = r3(maxRadius * 2 + CHIP_SIZE + 24);

  return (
    <div
      className={cn("pb-orbit-icons relative", className)}
      data-pause-on-hover={pauseOnHover ? "true" : "false"}
      style={{ width: box, height: box, maxWidth: "100%", ...style }}
      {...props}
    >
      {resolved.map((ring, ri) => {
        const diameter = r3(ring.radius * 2);
        const half = r3(ring.radius);
        const n = ring.icons.length;
        const ringDir = ring.reverse ? "reverse" : "normal";
        const chipDir = ring.reverse ? "normal" : "reverse";

        return (
          <React.Fragment key={ri}>
            {/* Static dashed orbit path — decorative, does not spin. */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
              style={{
                width: diameter,
                height: diameter,
                marginLeft: -half,
                marginTop: -half,
                border: `1.5px dashed ${ring.accent}33`,
              }}
            />

            {/* Rotating carrier — spins the chip slots around the center. */}
            <div
              aria-hidden
              data-orbit-spin
              className="pointer-events-none absolute left-1/2 top-1/2"
              style={{
                width: diameter,
                height: diameter,
                marginLeft: -half,
                marginTop: -half,
                willChange: "transform",
                animationName: reduced ? undefined : "pb-orbit-icons-spin",
                animationDuration: `${ring.duration}s`,
                animationTimingFunction: "linear",
                animationIterationCount: "infinite",
                animationDirection: ringDir,
              }}
            >
              {ring.icons.map((icon, ii) => {
                // Even, deterministic spacing around the ring.
                const angle = n > 0 ? r3((360 / n) * ii) : 0;
                return (
                  <div
                    // eslint-disable-next-line react/no-array-index-key
                    key={ii}
                    className="absolute left-1/2 top-1/2"
                    style={{
                      width: CHIP_SIZE,
                      height: CHIP_SIZE,
                      marginLeft: -CHIP_SIZE / 2,
                      marginTop: -CHIP_SIZE / 2,
                      // Place at (radius, angle), upright at rest.
                      transform: `rotate(${angle}deg) translateX(${half}px) rotate(${-angle}deg)`,
                    }}
                  >
                    {/* Counter-spin cancels the carrier so icons stay level. */}
                    <div
                      data-orbit-spin
                      className={cn(
                        "grid size-full place-items-center rounded-full",
                        "backdrop-blur-sm",
                        "[&_img]:size-5 [&_svg]:size-5"
                      )}
                      style={{
                        color: ring.accent,
                        background: `radial-gradient(circle at 32% 26%, rgba(255,255,255,0.16), rgba(255,255,255,0.02))`,
                        border: `1px solid ${ring.accent}55`,
                        boxShadow: `0 8px 24px -12px ${ring.accent}, inset 0 1px 0 rgba(255,255,255,0.14)`,
                        willChange: "transform",
                        animationName: reduced
                          ? undefined
                          : "pb-orbit-icons-spin",
                        animationDuration: `${ring.duration}s`,
                        animationTimingFunction: "linear",
                        animationIterationCount: "infinite",
                        animationDirection: chipDir,
                      }}
                    >
                      {icon}
                    </div>
                  </div>
                );
              })}
            </div>
          </React.Fragment>
        );
      })}

      {/* Soft centered glow tying the composition together. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: r3(CHIP_SIZE * 2.6),
          height: r3(CHIP_SIZE * 2.6),
          background: `radial-gradient(circle, ${PB_PALETTE[0]}33, transparent 70%)`,
        }}
      />

      {/* Centerpiece — consumer content, above the rings. */}
      <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        {children}
      </div>
    </div>
  );
}

export default OrbitIcons;
