"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Round a float to 3 decimals — full-precision floats trip React hydration. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * The eight sun rays, laid out at fixed 45° steps around the 24×24 viewBox
 * centre. Computed once at module load from constant angles, so the array is
 * byte-identical on the server and the client — no `Math.random()`, no
 * `Date.now()`, and every coordinate is pre-rounded to survive hydration.
 */
const RAYS: ReadonlyArray<{ x1: number; y1: number; x2: number; y2: number }> =
  Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i;
    const inner = 8.5;
    const outer = 11;
    return {
      x1: r3(12 + Math.cos(a) * inner),
      y1: r3(12 + Math.sin(a) * inner),
      x2: r3(12 + Math.cos(a) * outer),
      y2: r3(12 + Math.sin(a) * outer),
    };
  });

/**
 * Inject a `<style>` once, keyed by `id`. All rules are scoped under
 * `.pb-theme-toggle`, so several toggles on a page share one stylesheet and it
 * never leaks. SSR-safe: the DOM write happens in an effect, never in render.
 */
function useInjectedKeyframes(id: string, css: string): void {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }, [id, css]);
}

const KF_ID = "pb-theme-toggle-kf";
const KEYFRAMES = `
.pb-theme-toggle .pb-tt-svg { display: block; overflow: visible; }

/* The disc: warm sun in light, cool moon in dark. */
.pb-theme-toggle .pb-tt-disc {
  transition: fill 520ms cubic-bezier(.22,1,.36,1);
}
.pb-theme-toggle[data-theme="light"] .pb-tt-disc { fill: var(--pb-tt-sun); }
.pb-theme-toggle[data-theme="dark"]  .pb-tt-disc { fill: var(--pb-tt-moon); }

/* The masking circle slides in from the upper-right to bite a crescent. */
.pb-theme-toggle .pb-tt-cut {
  transition: transform 560ms cubic-bezier(.22,1,.36,1);
}
.pb-theme-toggle[data-theme="light"] .pb-tt-cut { transform: translate(9px, -9px); }
.pb-theme-toggle[data-theme="dark"]  .pb-tt-cut { transform: translate(0px, 0px); }

/* Rays fan out for the sun, retract + fade for the moon. */
.pb-theme-toggle .pb-tt-rays {
  stroke: var(--pb-tt-sun);
  stroke-width: 2;
  stroke-linecap: round;
  transform-box: view-box;
  transform-origin: center;
  transition:
    transform 560ms cubic-bezier(.22,1,.36,1),
    opacity 360ms cubic-bezier(.22,1,.36,1);
}
.pb-theme-toggle[data-theme="light"] .pb-tt-rays { transform: rotate(0deg) scale(1); opacity: 1; }
.pb-theme-toggle[data-theme="dark"]  .pb-tt-rays { transform: rotate(-55deg) scale(.35); opacity: 0; }

/* Stars fade in beside the crescent at night, with a soft ambient twinkle. */
.pb-theme-toggle .pb-tt-star {
  fill: var(--pb-tt-moon);
  transform-box: fill-box;
  transform-origin: center;
  transition: opacity 420ms cubic-bezier(.22,1,.36,1);
}
.pb-theme-toggle[data-theme="light"] .pb-tt-star { opacity: 0; }
.pb-theme-toggle[data-theme="dark"]  .pb-tt-star {
  opacity: 1;
  animation: pb-tt-twinkle 2.6s ease-in-out infinite;
}
.pb-theme-toggle[data-theme="dark"] .pb-tt-star--b { animation-delay: .9s; }

@keyframes pb-tt-twinkle {
  0%, 100% { opacity: .4; transform: scale(.72); }
  50%      { opacity: 1;  transform: scale(1); }
}

/* Full reduced-motion fallback: instant swap, no morph, static (un-twinkling) stars. */
@media (prefers-reduced-motion: reduce) {
  .pb-theme-toggle .pb-tt-disc,
  .pb-theme-toggle .pb-tt-cut,
  .pb-theme-toggle .pb-tt-rays,
  .pb-theme-toggle .pb-tt-star {
    transition-duration: 0ms !important;
  }
  .pb-theme-toggle .pb-tt-star { animation: none !important; }
}
`;

export type Theme = "light" | "dark";

export interface ThemeToggleProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "onChange" | "type"
  > {
  /** Controlled theme. Pair with `onThemeChange`; the parent owns the DOM. */
  theme?: Theme;
  /** Uncontrolled initial theme. Defaults to `"light"`. */
  defaultTheme?: Theme;
  /** Fires with the next theme whenever the button is toggled. */
  onThemeChange?: (theme: Theme) => void;
  /** Icon edge length in px. Defaults to 20. */
  size?: number;
  /** Sun disc + ray colour. Mirrors the site `--pb-ember` token (#f5a623). */
  sunColor?: string;
  /** Moon disc + star colour. Mirrors the site `--pb-signal` token (#22d3ee). */
  moonColor?: string;
  /** Focus-ring + hover colour. Mirrors the site `--pb-violet` token (#8b5cf6). */
  ringColor?: string;
  /**
   * When uncontrolled, toggle the `dark` class on `document.documentElement`
   * and, on mount, sync the initial state from it. Set `false` for a purely
   * visual toggle with no global side effects. Defaults to `true`.
   */
  syncDocumentClass?: boolean;
}

/**
 * ThemeToggle — an animated sun ⇄ moon theme button. The whole morph is
 * CSS-only (deps: none): a masking circle slides in from the upper-right to
 * bite the sun disc into a crescent, the eight rays retract and fade, the disc
 * warms/cools between colours, and two stars fade in with a gentle twinkle. All
 * on `cubic-bezier(.22,1,.36,1)` easing driven off a single `data-theme`
 * attribute, so the timeline is reversible and interruptible.
 *
 * Works controlled (`theme` + `onThemeChange`, parent owns the DOM) or
 * uncontrolled (owns its own state, toggles the `dark` class on
 * `document.documentElement`, and syncs its initial value from that class in an
 * effect). SSR-safe: the first render derives its icon purely from the prop
 * default — the DOM is only read after mount — so server and client agree.
 *
 * Real `<button>` semantics with a swapping `aria-label`, `aria-pressed`, a
 * `:focus-visible` ring, and full keyboard operability. Under
 * `prefers-reduced-motion` the swap is instant with no morph and the stars hold
 * still, leaving a static, legible sun or moon.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (sun = ember #f5a623, moon =
 * signal #22d3ee, ring = violet #8b5cf6, over ink #0f0f10).
 *
 * @parable/theme-toggle
 */
export function ThemeToggle({
  theme,
  defaultTheme = "light",
  onThemeChange,
  size = 20,
  sunColor = "#f5a623",
  moonColor = "#22d3ee",
  ringColor = "#8b5cf6",
  syncDocumentClass = true,
  className,
  style,
  children,
  ...props
}: ThemeToggleProps) {
  useInjectedKeyframes(KF_ID, KEYFRAMES);

  const isControlled = theme !== undefined;
  const [uncontrolled, setUncontrolled] = React.useState<Theme>(defaultTheme);
  const resolved: Theme = isControlled ? theme : uncontrolled;

  const rawId = React.useId();
  const maskId = `pb-theme-toggle-cut-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  // Sync the uncontrolled state FROM the document class — after mount only, so
  // the first client render matches the server (which can't see the DOM).
  React.useEffect(() => {
    if (isControlled || !syncDocumentClass) return;
    if (typeof document === "undefined") return;
    const isDark = document.documentElement.classList.contains("dark");
    setUncontrolled(isDark ? "dark" : "light");
    // Mount-only: a one-shot read of the initial DOM theme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = React.useCallback(
    (next: Theme) => {
      if (isControlled) {
        onThemeChange?.(next);
        return;
      }
      setUncontrolled(next);
      if (syncDocumentClass && typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", next === "dark");
      }
      onThemeChange?.(next);
    },
    [isControlled, syncDocumentClass, onThemeChange]
  );

  return (
    <button
      type="button"
      data-theme={resolved}
      aria-pressed={resolved === "dark"}
      aria-label={
        resolved === "dark" ? "Switch to light theme" : "Switch to dark theme"
      }
      onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
      className={cn(
        "pb-theme-toggle group relative inline-flex cursor-pointer items-center justify-center gap-2 rounded-full p-2",
        "outline-none transition-colors duration-200",
        "hover:bg-[var(--pb-tt-ring)]/10",
        "focus-visible:ring-2 focus-visible:ring-[var(--pb-tt-ring)]",
        className
      )}
      style={
        {
          "--pb-tt-sun": sunColor,
          "--pb-tt-moon": moonColor,
          "--pb-tt-ring": ringColor,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      <svg
        className="pb-tt-svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
            <rect x="0" y="0" width="24" height="24" fill="#fff" />
            <circle className="pb-tt-cut" cx="17" cy="7" r="6" fill="#000" />
          </mask>
        </defs>

        <circle
          className="pb-tt-disc"
          cx="12"
          cy="12"
          r="6"
          mask={`url(#${maskId})`}
        />

        <g className="pb-tt-rays" aria-hidden="true">
          {RAYS.map((ray, i) => (
            <line key={i} x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2} />
          ))}
        </g>

        <circle className="pb-tt-star" cx="17.5" cy="7.5" r="1.05" />
        <circle className="pb-tt-star pb-tt-star--b" cx="19.5" cy="11.5" r="0.75" />
      </svg>

      {children}
    </button>
  );
}

export default ThemeToggle;
