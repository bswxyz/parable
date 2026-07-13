"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Surface treatment for the button face. */
export type TextureButtonVariant = "accent" | "surface" | "glass";

/**
 * Grayscale fractal-noise grain, inlined as an SVG data URI so the file stays
 * self-contained. Static and deterministic — safe to emit during SSR.
 */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 140 140'%3E%3Cfilter id='pbtbn'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23pbtbn)'/%3E%3C/svg%3E\")";

/**
 * Per-variant CSS custom properties: the gradient face, hairline border, top
 * sheen colour, and the three composed box-shadow stacks (rest / hover /
 * pressed). Layering the highlight + depth + lift + press into single shadow
 * strings keeps the JSX to one class per state.
 */
const VARIANT_VARS: Record<TextureButtonVariant, Record<string, string>> = {
  accent: {
    "--pb-tb-face": "linear-gradient(180deg,#a78bfa 0%,#8b5cf6 46%,#7c3aed 100%)",
    "--pb-tb-border": "rgba(255,255,255,0.16)",
    "--pb-tb-sheen": "rgba(255,255,255,0.30)",
    "--pb-tb-rest":
      "inset 0 1px 0 0 rgba(255,255,255,0.42), inset 0 -2px 3px 0 rgba(59,21,120,0.55), 0 1px 2px 0 rgba(15,15,16,0.5), 0 6px 16px -4px rgba(124,58,237,0.55)",
    "--pb-tb-hover":
      "inset 0 1px 0 0 rgba(255,255,255,0.52), inset 0 -2px 3px 0 rgba(59,21,120,0.5), 0 2px 4px 0 rgba(15,15,16,0.45), 0 10px 24px -4px rgba(124,58,237,0.72)",
    "--pb-tb-active":
      "inset 0 2px 6px 0 rgba(46,16,101,0.78), inset 0 1px 0 0 rgba(255,255,255,0.14), 0 1px 1px 0 rgba(15,15,16,0.4)",
  },
  surface: {
    "--pb-tb-face": "linear-gradient(180deg,#1d1d20 0%,#161618 58%,#0f0f10 100%)",
    "--pb-tb-border": "rgba(255,255,255,0.10)",
    "--pb-tb-sheen": "rgba(255,255,255,0.10)",
    "--pb-tb-rest":
      "inset 0 1px 0 0 rgba(255,255,255,0.08), inset 0 -1px 0 0 rgba(0,0,0,0.6), 0 1px 2px 0 rgba(0,0,0,0.55), 0 5px 14px -6px rgba(0,0,0,0.7)",
    "--pb-tb-hover":
      "inset 0 1px 0 0 rgba(255,255,255,0.13), inset 0 -1px 0 0 rgba(0,0,0,0.6), 0 2px 4px 0 rgba(0,0,0,0.5), 0 9px 20px -6px rgba(0,0,0,0.78)",
    "--pb-tb-active":
      "inset 0 2px 6px 0 rgba(0,0,0,0.78), inset 0 1px 0 0 rgba(255,255,255,0.05)",
  },
  glass: {
    "--pb-tb-face":
      "linear-gradient(180deg,rgba(255,255,255,0.16) 0%,rgba(255,255,255,0.05) 100%)",
    "--pb-tb-border": "rgba(255,255,255,0.22)",
    "--pb-tb-sheen": "rgba(255,255,255,0.28)",
    "--pb-tb-rest":
      "inset 0 1px 0 0 rgba(255,255,255,0.35), inset 0 -1px 1px 0 rgba(0,0,0,0.25), 0 1px 2px 0 rgba(0,0,0,0.3), 0 6px 18px -6px rgba(0,0,0,0.45)",
    "--pb-tb-hover":
      "inset 0 1px 0 0 rgba(255,255,255,0.45), inset 0 -1px 1px 0 rgba(0,0,0,0.22), 0 2px 5px 0 rgba(0,0,0,0.28), 0 10px 24px -6px rgba(0,0,0,0.5)",
    "--pb-tb-active":
      "inset 0 2px 8px 0 rgba(0,0,0,0.4), inset 0 1px 0 0 rgba(255,255,255,0.18)",
  },
};

/** Text colour + backdrop treatment layered on top of the shared face. */
const VARIANT_CLASS: Record<TextureButtonVariant, string> = {
  accent: "text-white",
  surface: "text-white/90",
  glass: "text-white backdrop-blur-md",
};

export interface TextureButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Surface treatment. `"accent"` = violet gradient face (default),
   * `"surface"` = ink face with a hairline border, `"glass"` = translucent
   * face with a backdrop blur.
   */
  variant?: TextureButtonVariant;
  /**
   * Render as a different element for navigation semantics — e.g. an `<a>` or a
   * router `Link`. Defaults to `"button"`. Pass `href` alongside for links.
   */
  as?: React.ElementType;
  /** Destination, used when rendering as a link element via `as`. */
  href?: string;
}

/**
 * TextureButton — a tactile button built from stacked surface layers: a
 * gradient face, an inlined grayscale noise/grain overlay, a soft top-inner
 * sheen, and a composed inset+drop box-shadow that reads as a raised, lit
 * chip. Pressing it deepens the inner shadow and sinks the whole face a couple
 * of pixels, so mouse and keyboard (`Space`) both feel like a real button
 * click. `"accent"` is a violet face (default), `"surface"` an ink face with a
 * hairline border, `"glass"` a translucent face with `backdrop-blur`. The
 * `:focus-visible` ring is drawn as an outline sitting outside the button, so
 * it is never clipped by the layered surface. Polymorphic via `as` for links.
 *
 * Under `prefers-reduced-motion` the press transform is dropped (the surface
 * stays put) while the pressed colour/shadow still fires, so the active state
 * stays legible without motion. Colours default to the site's `--pb-*` tokens
 * (violet #8b5cf6, ember/ink #0f0f10; focus ring signal cyan #22d3ee).
 *
 * @parable/texture-button
 */
export const TextureButton = React.forwardRef<
  HTMLButtonElement,
  TextureButtonProps
>(function TextureButton(
  { variant = "accent", as, className, children, style, ...props },
  ref
) {
  const Comp = (as ?? "button") as React.ElementType;

  const mergedStyle = {
    ...(VARIANT_VARS[variant] as React.CSSProperties),
    ...style,
  } as React.CSSProperties;

  return (
    <Comp
      ref={ref}
      style={mergedStyle}
      className={cn(
        "group relative isolate inline-flex select-none items-center justify-center gap-2",
        "overflow-hidden whitespace-nowrap rounded-xl border px-5 py-2.5",
        "text-sm font-semibold leading-none",
        "[background:var(--pb-tb-face)] [border-color:var(--pb-tb-border)]",
        // Layered tactile shadow, driven directly so it never collides with the
        // focus outline. Pressed (:active) wins over :hover via source order.
        "[box-shadow:var(--pb-tb-rest)]",
        "hover:[box-shadow:var(--pb-tb-hover)]",
        "active:[box-shadow:var(--pb-tb-active)]",
        "transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(.22,1,.36,1)]",
        "motion-reduce:transition-none",
        // Press sinks the face; suppressed under reduced motion (colour stays).
        "motion-safe:hover:-translate-y-px motion-safe:active:translate-y-[2px]",
        // Focus ring lives OUTSIDE the button as an offset outline (transparent
        // at rest to avoid layout shift, signal cyan when keyboard-focused).
        "[outline:2px_solid_transparent] [outline-offset:2px]",
        "focus-visible:[outline-color:#22d3ee]",
        "disabled:pointer-events-none disabled:opacity-55",
        VARIANT_CLASS[variant],
        className
      )}
      {...props}
    >
      {/* Grain overlay — decorative surface noise. */}
      <span
        aria-hidden
        style={{ backgroundImage: GRAIN }}
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.13] mix-blend-overlay [background-size:140px_140px]"
      />

      {/* Soft top-inner highlight — the lit bevel of the chip. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-1/2 [background:linear-gradient(180deg,var(--pb-tb-sheen),transparent_72%)]"
      />

      {/* Label sits above the texture layers. */}
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
    </Comp>
  );
});

export default TextureButton;
