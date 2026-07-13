"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Inject a `<style>` with `@keyframes` exactly once per id, from an effect so
 * the first client paint matches the server (no SSR keyframe mismatch). Kept in
 * the document head for the lifetime of the app — sibling instances share it.
 */
function useInjectedKeyframes(id: string, css: string) {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }, [id, css]);
}

/** Very slow resting breath for the ambient edge — opacity only, compositor-cheap. */
const KEYFRAMES = `
@keyframes pb-spotlight-card-breathe {
  0%, 100% { opacity: 0.32; }
  50% { opacity: 0.55; }
}
`;

/** SSR-safe reduced-motion preference; false until mounted so the first client paint matches the server. */
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

/** Frame-only mask: a radial layer is padded by the ring thickness, then the content-box is punched out so only the border remains lit. */
const RING_MASK: React.CSSProperties = {
  WebkitMask:
    "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  WebkitMaskComposite: "xor",
  mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  maskComposite: "exclude",
};

export interface SpotlightCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Colour of the spotlight and edge glow. Mirrors the site `--pb-violet` token. */
  glowColor?: string;
  /** Diameter of the light pool, in px. Larger = softer, wider wash. */
  radius?: number;
  /** Card contents. Rendered above every decorative layer. */
  children?: React.ReactNode;
}

/**
 * SpotlightCard — a surface lit by a pointer-following spotlight. Two decorative
 * layers read the cursor from CSS custom properties (`--pb-sc-mx` / `--pb-sc-my`)
 * written directly on `pointermove`, so tracking never touches React state or
 * triggers a re-render: a soft radial **face glow** washes across the card body,
 * and a **border-glow ring** — a radial layer masked to the frame via
 * `mask-composite` — brightens the edge exactly where the light touches. A faint
 * ambient ring keeps the card alive at rest with a slow opacity breath. Each card
 * measures its own bounds in the handler, so any number of them can share a grid
 * and light independently. Decorative layers are `aria-hidden`; content sits above
 * them, and tabbing to an inner control reveals the glow via `:focus-within`.
 *
 * Under `prefers-reduced-motion` there is no tracking: a single static, centred
 * soft glow is shown and the resting breath is disabled.
 *
 * Colour default mirrors the site's `--pb-*` tokens (glow = violet #8b5cf6; over
 * an ink #0f0f10 surface, with fuchsia #ec4899 / ember #f5a623 / signal #22d3ee
 * as alternates).
 *
 * @parable/spotlight-card
 */
export function SpotlightCard({
  glowColor = "#8b5cf6",
  radius = 320,
  className,
  children,
  style,
  onPointerMove,
  ...props
}: SpotlightCardProps) {
  useInjectedKeyframes("pb-spotlight-card-kf", KEYFRAMES);
  const reduced = usePrefersReducedMotion();

  const handlePointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(e);
      if (reduced) return;
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      // Written outside render, in an event — no hydration concern. Integers
      // keep the compositor's job cheap.
      el.style.setProperty("--pb-sc-mx", `${Math.round(e.clientX - rect.left)}px`);
      el.style.setProperty("--pb-sc-my", `${Math.round(e.clientY - rect.top)}px`);
    },
    [onPointerMove, reduced]
  );

  const rootStyle = {
    "--pb-sc-glow": glowColor,
    "--pb-sc-r": `${Math.max(1, radius)}px`,
    "--pb-sc-mx": "50%",
    "--pb-sc-my": "50%",
    ...style,
  } as React.CSSProperties;

  // Reveal is CSS-only: hover/focus-within fade the tracking layers in. Under
  // reduced motion the face glow is shown statically and the bright ring stays off.
  const faceReveal = reduced
    ? "opacity-100"
    : "opacity-0 transition-opacity duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:opacity-100 group-focus-within:opacity-100";
  const ringReveal = reduced
    ? "opacity-0"
    : "opacity-0 transition-opacity duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:opacity-100 group-focus-within:opacity-100";

  return (
    <div
      onPointerMove={handlePointerMove}
      style={rootStyle}
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "border border-white/10 bg-white/[0.02] text-white shadow-sm",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--pb-sc-glow)]/70",
        className
      )}
      {...props}
    >
      {/* Ambient edge — a faint static frame that slowly breathes at rest. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          ...RING_MASK,
          padding: "1px",
          background:
            "color-mix(in srgb, var(--pb-sc-glow) 32%, transparent)",
          opacity: reduced ? 0.4 : undefined,
          animation: reduced
            ? undefined
            : "pb-spotlight-card-breathe 5s ease-in-out infinite",
        }}
      />

      {/* Face glow — soft radial wash tracking the pointer across the body. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit]",
          faceReveal
        )}
        style={{
          background:
            "radial-gradient(circle var(--pb-sc-r) at var(--pb-sc-mx) var(--pb-sc-my), color-mix(in srgb, var(--pb-sc-glow) 22%, transparent) 0%, transparent 72%)",
        }}
      />

      {/* Border-glow ring — bright edge highlight, masked to the frame only. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit]",
          ringReveal
        )}
        style={{
          ...RING_MASK,
          padding: "1.5px",
          background:
            "radial-gradient(circle var(--pb-sc-r) at var(--pb-sc-mx) var(--pb-sc-my), color-mix(in srgb, var(--pb-sc-glow) 85%, transparent) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default SpotlightCard;
