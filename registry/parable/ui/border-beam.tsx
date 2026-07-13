"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Inject a `<style>` block exactly once per document, keyed by a unique id.
 * Runs from an effect so it never affects the SSR markup — the server and the
 * first client render produce identical DOM, and the styles attach afterward.
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

/** Round a float so no full-precision value reaches an inline style. */
function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

const KEYFRAMES = `
@keyframes pb-border-beam-travel {
  to { offset-distance: 100%; }
}
.pb-border-beam__ring {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: var(--pb-bb-border);
  background: linear-gradient(
    120deg,
    color-mix(in srgb, var(--pb-bb-from) 42%, transparent),
    color-mix(in srgb, var(--pb-bb-to) 42%, transparent)
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
}
.pb-border-beam__beam {
  position: absolute;
  top: 0;
  left: 0;
  aspect-ratio: 1;
  width: var(--pb-bb-size);
  background: linear-gradient(
    to left,
    var(--pb-bb-from),
    var(--pb-bb-to),
    transparent
  );
  offset-path: rect(0 auto auto 0 round var(--pb-bb-radius));
  offset-distance: 0%;
  will-change: offset-distance;
  animation: pb-border-beam-travel var(--pb-bb-duration) linear infinite;
  animation-delay: var(--pb-bb-delay, 0s);
  animation-direction: var(--pb-bb-direction, normal);
}
@media (prefers-reduced-motion: reduce) {
  .pb-border-beam__beam {
    display: none !important;
    animation: none !important;
  }
  .pb-border-beam__ring {
    background: linear-gradient(120deg, var(--pb-bb-from), var(--pb-bb-to));
  }
}
`;

export interface BorderBeamProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Content that sits on the card face, inside the traced border. */
  children?: React.ReactNode;
  /** Beam length in px — the size of the travelling comet head. */
  size?: number;
  /** Seconds for one full lap around the perimeter. */
  duration?: number;
  /** Delay in seconds before the beam starts — stagger multiple beams. */
  delay?: number;
  /** Head colour of the comet and one end of the static ring. Mirrors `--pb-violet`. */
  colorFrom?: string;
  /** Tail colour of the comet and the other end of the static ring. Mirrors `--pb-fuchsia`. */
  colorTo?: string;
  /** Border thickness in px — how wide the traced ring is. */
  borderWidth?: number;
  /** Corner radius as any CSS length (e.g. `"16px"`, `"1rem"`). */
  radius?: string;
  /** Send the comet the other way around the border. */
  reverse?: boolean;
}

/**
 * BorderBeam — wraps content in a card face and traces a glowing comet
 * continuously around its rounded border. The border ring is carved with a
 * `mask-composite: exclude` sandwich (a full mask minus the content box leaves
 * only the edge), and a small `colorFrom → colorTo → transparent` gradient box
 * rides that edge via CSS Motion Path: `offset-path: rect(… round radius)` with
 * `offset-distance` animated 0 → 100 %, so the head follows the exact rounded
 * perimeter and the tail streaks behind it. The beam is clipped to the ring, so
 * it rides the border only and never touches the content.
 *
 * Everything is pure CSS keyframes injected once (`pb-border-beam-kf`) — no rAF,
 * no JS per frame, no `Math.random`/`Date.now`, so the server and first client
 * render match. Under `prefers-reduced-motion` the comet is removed and the
 * ring falls back to a solid, legible `colorFrom → colorTo` gradient border.
 * The whole beam layer is `aria-hidden`; children keep their own semantics and
 * focus behaviour. Default palette mirrors the site's `--pb-*` tokens (violet
 * #8b5cf6 → fuchsia #ec4899 on ink #0f0f10).
 *
 * @parable/border-beam
 */
export function BorderBeam({
  children,
  size = 64,
  duration = 6,
  delay = 0,
  colorFrom = "#8b5cf6",
  colorTo = "#ec4899",
  borderWidth = 1.5,
  radius = "16px",
  reverse = false,
  className,
  style,
  ...props
}: BorderBeamProps) {
  useInjectedKeyframes("pb-border-beam-kf", KEYFRAMES);

  const vars = {
    "--pb-bb-size": `${round(size)}px`,
    "--pb-bb-duration": `${round(duration)}s`,
    "--pb-bb-delay": `${round(delay)}s`,
    "--pb-bb-from": colorFrom,
    "--pb-bb-to": colorTo,
    "--pb-bb-border": `${round(borderWidth)}px`,
    "--pb-bb-radius": radius,
    "--pb-bb-direction": reverse ? "reverse" : "normal",
    borderRadius: radius,
  } as React.CSSProperties;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ ...vars, ...style }}
      {...props}
    >
      {/* Decorative border ring + travelling comet — no semantics, no focus. */}
      <div aria-hidden className="pb-border-beam__ring pointer-events-none">
        <span className="pb-border-beam__beam" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default BorderBeam;
