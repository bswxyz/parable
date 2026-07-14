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

const AXIS_SPECIMEN_CSS = `
.pb-axisspecimen{min-width:0;}
.pb-axisspecimen-stage{position:relative;display:grid;align-items:center;min-height:clamp(150px,28vh,300px);padding:clamp(16px,4vw,40px) 0;border-bottom:1px solid var(--pb-axs-line);overflow:hidden;}
.pb-axisspecimen-word{width:100%;margin:0;line-height:1.05;overflow-wrap:anywhere;white-space:pre-wrap;outline:none;color:var(--pb-axs-word);caret-color:var(--pb-axs-accent);transition:font-variation-settings .45s cubic-bezier(.22,1,.36,1),font-size .45s cubic-bezier(.22,1,.36,1),letter-spacing .45s cubic-bezier(.22,1,.36,1);}
.pb-axisspecimen-word:empty::before{content:attr(data-placeholder);opacity:.3;}
.pb-axisspecimen-word:focus-visible{outline:2px solid var(--pb-axs-accent);outline-offset:6px;border-radius:2px;}
.pb-axisspecimen-readout{display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px 20px;padding:10px 0;border-bottom:1px solid var(--pb-axs-line);font-family:${MONO};font-size:.68rem;letter-spacing:.06em;color:var(--pb-axs-muted);font-variant-numeric:tabular-nums;}
.pb-axisspecimen-hint{color:var(--pb-axs-accent);}
.pb-axisspecimen-presets{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 4px;}
.pb-axisspecimen-preset{font-family:${MONO};font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;padding:7px 12px;border:1px solid var(--pb-axs-line);border-radius:999px;background:transparent;color:var(--pb-axs-muted);cursor:pointer;transition:color .2s ease,border-color .2s ease,background .2s ease;}
.pb-axisspecimen-preset:hover{color:var(--pb-axs-word);border-color:var(--pb-axs-accent);}
.pb-axisspecimen-preset[aria-pressed="true"]{background:var(--pb-axs-accent);border-color:var(--pb-axs-accent);color:var(--pb-axs-bg);}
.pb-axisspecimen-preset:focus-visible{outline:2px solid var(--pb-axs-accent);outline-offset:2px;}
.pb-axisspecimen-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:2px 28px;padding-top:6px;}
.pb-axisspecimen-row{padding:10px 0 2px;min-width:0;}
.pb-axisspecimen-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:2px;}
.pb-axisspecimen-head label{font-family:${MONO};font-size:.64rem;letter-spacing:.12em;text-transform:uppercase;color:var(--pb-axs-muted);}
.pb-axisspecimen-head label b{color:var(--pb-axs-accent);font-weight:400;text-transform:none;letter-spacing:.04em;}
.pb-axisspecimen-val{font-family:${MONO};font-size:.72rem;color:var(--pb-axs-word);font-variant-numeric:tabular-nums;white-space:nowrap;}
.pb-axisspecimen-range{-webkit-appearance:none;appearance:none;width:100%;height:24px;margin:0;background:transparent;cursor:pointer;}
.pb-axisspecimen-range::-webkit-slider-runnable-track{height:2px;background:var(--pb-axs-line);border-radius:1px;}
.pb-axisspecimen-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:7px;height:18px;margin-top:-8px;border:none;border-radius:2px;background:var(--pb-axs-accent);transition:transform .18s ease;}
.pb-axisspecimen-range::-webkit-slider-thumb:hover{transform:scaleY(1.2);}
.pb-axisspecimen-range::-moz-range-track{height:2px;background:var(--pb-axs-line);border-radius:1px;}
.pb-axisspecimen-range::-moz-range-thumb{width:7px;height:18px;border:none;border-radius:2px;background:var(--pb-axs-accent);}
.pb-axisspecimen-range:focus-visible{outline:2px solid var(--pb-axs-accent);outline-offset:4px;border-radius:2px;}
@media (prefers-reduced-motion:reduce){
.pb-axisspecimen-word,.pb-axisspecimen-preset,.pb-axisspecimen-range::-webkit-slider-thumb{transition:none!important;}
}
`;

/** One variable-font axis exposed as a labelled slider. */
export interface AxisDef {
  /** OpenType axis tag exactly as the font defines it, e.g. "wght", "opsz", "SOFT". */
  tag: string;
  /** Human-readable label. Falls back to the tag alone. */
  label?: string;
  /** Axis minimum. */
  min: number;
  /** Axis maximum. */
  max: number;
  /** Initial value. Defaults to `min`. */
  default?: number;
  /** Slider granularity. Defaults to 1. */
  step?: number;
}

/** A named snapshot of axis values (plus optional size/tracking). */
export interface AxisPreset {
  name: string;
  /** Axis values by tag. Tags not present in `axes` are ignored; values are clamped. */
  values: Record<string, number>;
  /** Optional specimen font-size in px. */
  size?: number;
  /** Optional tracking in hundredths of an em. */
  tracking?: number;
}

/** Fraunces' four variation axes — the component's default `axes`. */
const FRAUNCES_AXES: AxisDef[] = [
  { tag: "opsz", label: "Optical size", min: 9, max: 144, default: 96 },
  { tag: "wght", label: "Weight", min: 100, max: 900, default: 620 },
  { tag: "SOFT", label: "Softness", min: 0, max: 100, default: 0 },
  { tag: "WONK", label: "Wonk", min: 0, max: 1, default: 1 },
];

/** Presets tuned for Fraunces; used only when `axes` is left at its default. */
const FRAUNCES_PRESETS: AxisPreset[] = [
  { name: "Broadside", values: { opsz: 144, wght: 890, SOFT: 0, WONK: 1 }, size: 148, tracking: -2 },
  { name: "Sermon", values: { opsz: 13, wght: 415, SOFT: 0, WONK: 0 }, size: 56, tracking: 0 },
  { name: "Footnote", values: { opsz: 9, wght: 560, SOFT: 20, WONK: 0 }, size: 36, tracking: 2.5 },
  { name: "Marshmallow", values: { opsz: 110, wght: 720, SOFT: 100, WONK: 0 }, size: 124, tracking: -1 },
];

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/** Format an axis value at its step's precision (tabular-safe, no float noise). */
function fmt(v: number, step: number): string {
  if (Number.isInteger(step)) return String(Math.round(v));
  const decimals = Math.min(3, Math.max(1, (String(step).split(".")[1] ?? "").length));
  return v.toFixed(decimals);
}

export interface AxisSpecimenProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /**
   * CSS `font-family` the specimen renders in. Loading the font is the
   * consumer's job (`next/font`, `@font-face`, or a Google Fonts link).
   */
  fontFamily?: string;
  /** Variable axes exposed as sliders. Defaults to Fraunces' opsz/wght/SOFT/WONK. */
  axes?: AxisDef[];
  /** Initial specimen text. When `editable`, typing replaces it in place. */
  text?: string;
  /** Render the specimen as a `plaintext-only` contentEditable line. */
  editable?: boolean;
  /** Preset chips. Defaults to four Fraunces presets when `axes` is default, else none. */
  presets?: AxisPreset[];
  /** Show the font-size slider. */
  showSize?: boolean;
  /** Show the tracking (letter-spacing) slider. */
  showTracking?: boolean;
  /** Initial specimen size in px (clamped to the viewport at render). */
  defaultSize?: number;
  /** [min, max] px for the size slider. */
  sizeRange?: [number, number];
  /** Initial tracking in hundredths of an em (−1 → −0.010em). */
  defaultTracking?: number;
  /** [min, max] for the tracking slider, in hundredths of an em. */
  trackingRange?: [number, number];
  /**
   * Idle "auto specimen": until any control is touched, the first two wide
   * axes breathe through a slow sine loop (paused off-screen, stopped forever
   * on first interaction, never started under prefers-reduced-motion).
   */
  breathe?: boolean;
  /** Fires with the full axis map (tag → value) on every user-driven change. */
  onChange?: (values: Record<string, number>) => void;
  /** Accent for slider thumbs, active presets, focus rings, axis tags. */
  accentColor?: string;
  /** Specimen text colour. Defaults to the `--foreground` token. */
  textColor?: string;
  /** aria-label for the editable specimen line. */
  specimenLabel?: string;
}

/**
 * AxisSpecimen — a live variable-font specimen playground. A giant editable
 * specimen line (contentEditable `plaintext-only`, `role="textbox"`) is
 * rendered through `font-variation-settings`, driven by labelled native range
 * sliders generated from the `axes` prop, plus optional size and tracking
 * controls and preset chips. A mono readout strip prints the exact
 * `font-variation-settings` value, ready to paste into CSS.
 *
 * Until a control is touched — and never under `prefers-reduced-motion` — the
 * first two wide axes "breathe" through a slow sine idle loop that pauses
 * off-screen and stops forever on first interaction. Preset changes glide via
 * a CSS transition; under reduced motion they jump instantly.
 *
 * Font loading is the consumer's job: pass `fontFamily` for a variable font
 * you have loaded. The default axes target Fraunces (opsz 9–144, wght
 * 100–900, SOFT 0–100, WONK 0–1), e.g. via
 * `https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,100..900,0..100,0..1&display=swap`.
 *
 * Colours read the site tokens `--foreground`, `--muted-foreground` and
 * `--border` with literal fallbacks; override via `accentColor`/`textColor`.
 * Sliders are keyboard-accessible with tabular-nums value readouts, and every
 * control carries a `:focus-visible` ring.
 *
 * @parable/axis-specimen
 */
export function AxisSpecimen({
  fontFamily = '"Fraunces", Georgia, serif',
  axes = FRAUNCES_AXES,
  text = "Hamburgefonstiv",
  editable = true,
  presets,
  showSize = true,
  showTracking = true,
  defaultSize = 112,
  sizeRange = [28, 220],
  defaultTracking = -1,
  trackingRange = [-6, 12],
  breathe = true,
  onChange,
  accentColor = "var(--pb-violet, #8b5cf6)",
  textColor = "var(--foreground, #17171a)",
  specimenLabel = "Specimen text — type to replace it",
  className,
  style,
  ...props
}: AxisSpecimenProps) {
  useInjectedKeyframes("pb-axisspecimen-css", AXIS_SPECIMEN_CSS);
  const reduced = usePrefersReducedMotion();
  const uid = React.useId();
  const rootRef = React.useRef<HTMLDivElement>(null);

  const [values, setValues] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(
      axes.map((a) => [a.tag, clamp(a.default ?? a.min, a.min, a.max)])
    )
  );
  const [size, setSize] = React.useState(() =>
    clamp(defaultSize, sizeRange[0], sizeRange[1])
  );
  const [tracking, setTracking] = React.useState(() =>
    clamp(defaultTracking, trackingRange[0], trackingRange[1])
  );

  const [interacted, setInteracted] = React.useState(false);
  const interactedRef = React.useRef(false);
  const takeOver = React.useCallback(() => {
    if (!interactedRef.current) {
      interactedRef.current = true;
      setInteracted(true);
    }
  }, []);

  /** Current value per axis, falling back to each axis default. */
  const merged = React.useMemo(() => {
    const out: Record<string, number> = {};
    for (const a of axes)
      out[a.tag] = values[a.tag] ?? clamp(a.default ?? a.min, a.min, a.max);
    return out;
  }, [axes, values]);

  const setAxis = (tag: string, v: number) => {
    takeOver();
    const next = { ...merged, [tag]: v };
    setValues(next);
    onChange?.(next);
  };

  const resolvedPresets =
    presets ?? (axes === FRAUNCES_AXES ? FRAUNCES_PRESETS : []);

  const applyPreset = (p: AxisPreset) => {
    takeOver();
    const next = { ...merged };
    for (const a of axes) {
      const pv = p.values[a.tag];
      if (typeof pv === "number") next[a.tag] = clamp(pv, a.min, a.max);
    }
    setValues(next);
    if (typeof p.size === "number")
      setSize(clamp(p.size, sizeRange[0], sizeRange[1]));
    if (typeof p.tracking === "number")
      setTracking(clamp(p.tracking, trackingRange[0], trackingRange[1]));
    onChange?.(next);
  };

  const isPresetActive = (p: AxisPreset) =>
    axes.every((a) => {
      const pv = p.values[a.tag];
      return typeof pv !== "number" || clamp(pv, a.min, a.max) === merged[a.tag];
    }) &&
    (typeof p.size !== "number" || p.size === size) &&
    (typeof p.tracking !== "number" || p.tracking === tracking);

  /* ---- idle "breathing": the first two wide axes drift on sine waves until
     someone takes over. ~24fps, paused off-screen, never under reduced
     motion. ---- */
  const breathing = React.useMemo(
    () => axes.filter((a) => a.max - a.min > 1).slice(0, 2),
    [axes]
  );

  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    if (!breathe) return;
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => setInView(entries.some((e) => e.isIntersecting)),
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [breathe]);

  React.useEffect(() => {
    if (!breathe || reduced || interacted || !inView || breathing.length === 0)
      return;
    let raf = 0;
    let last = 0;
    const t0 = performance.now();
    const loop = (t: number) => {
      if (interactedRef.current) return;
      if (t - last >= 42) {
        const s = (t - t0) / 1000;
        setValues((prev) => {
          const next = { ...prev };
          breathing.forEach((a, i) => {
            const step = a.step ?? 1;
            const mid = (a.min + a.max) / 2;
            const amp = (a.max - a.min) * 0.42;
            const raw = mid + amp * Math.sin(s * (0.55 - i * 0.24) + i * 1.4);
            next[a.tag] = clamp(Math.round(raw / step) * step, a.min, a.max);
          });
          return next;
        });
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [breathe, reduced, interacted, inView, breathing]);

  const settings = axes
    .map((a) => `"${a.tag}" ${fmt(merged[a.tag], a.step ?? 1)}`)
    .join(", ");
  const trackingEm = (tracking / 100).toFixed(3);

  const wordStyle: React.CSSProperties = {
    fontFamily,
    fontVariationSettings: settings,
    fontSize: `min(${Math.round(size)}px, 16vw)`,
    letterSpacing: `${trackingEm}em`,
  };

  const vars = {
    "--pb-axs-accent": accentColor,
    "--pb-axs-word": textColor,
    "--pb-axs-muted": "var(--muted-foreground, #6b6b76)",
    "--pb-axs-line": "var(--border, rgba(127,127,138,.28))",
    "--pb-axs-bg": "var(--background, #fff)",
  } as React.CSSProperties;

  return (
    <div
      ref={rootRef}
      className={cn("pb-axisspecimen", className)}
      style={{ ...vars, ...style }}
      {...props}
    >
      {/* ---- the stage ---- */}
      <div className="pb-axisspecimen-stage">
        {editable ? (
          <div
            key={text}
            className="pb-axisspecimen-word"
            style={wordStyle}
            contentEditable="plaintext-only"
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="false"
            aria-label={specimenLabel}
            spellCheck={false}
            data-placeholder={text}
            onFocus={takeOver}
            onInput={takeOver}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          >
            {text}
          </div>
        ) : (
          <p className="pb-axisspecimen-word" style={wordStyle}>
            {text}
          </p>
        )}
      </div>

      {/* ---- live readout: the exact CSS value ---- */}
      <div className="pb-axisspecimen-readout">
        <span>font-variation-settings: {settings};</span>
        {breathe && !reduced && !interacted && (
          <span className="pb-axisspecimen-hint" aria-hidden>
            auto specimen — touch any control to take over
          </span>
        )}
      </div>

      {/* ---- preset chips ---- */}
      {resolvedPresets.length > 0 && (
        <div
          className="pb-axisspecimen-presets"
          role="group"
          aria-label="Specimen presets"
        >
          {resolvedPresets.map((p) => (
            <button
              key={p.name}
              type="button"
              className="pb-axisspecimen-preset"
              aria-pressed={isPresetActive(p)}
              onFocus={takeOver}
              onClick={() => applyPreset(p)}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* ---- sliders ---- */}
      <div className="pb-axisspecimen-grid">
        {axes.map((a) => {
          const id = `${uid}-${a.tag}`;
          const step = a.step ?? 1;
          return (
            <div className="pb-axisspecimen-row" key={a.tag}>
              <div className="pb-axisspecimen-head">
                <label htmlFor={id}>
                  {a.label ? (
                    <>
                      {a.label} <b>{a.tag}</b>
                    </>
                  ) : (
                    <b>{a.tag}</b>
                  )}
                </label>
                <span className="pb-axisspecimen-val">
                  {fmt(merged[a.tag], step)}
                </span>
              </div>
              <input
                id={id}
                className="pb-axisspecimen-range"
                type="range"
                min={a.min}
                max={a.max}
                step={step}
                value={merged[a.tag]}
                onFocus={takeOver}
                onChange={(e) => setAxis(a.tag, Number(e.target.value))}
              />
            </div>
          );
        })}

        {showSize && (
          <div className="pb-axisspecimen-row">
            <div className="pb-axisspecimen-head">
              <label htmlFor={`${uid}-size`}>Size</label>
              <span className="pb-axisspecimen-val">{Math.round(size)} px</span>
            </div>
            <input
              id={`${uid}-size`}
              className="pb-axisspecimen-range"
              type="range"
              min={sizeRange[0]}
              max={sizeRange[1]}
              step={1}
              value={Math.round(size)}
              onFocus={takeOver}
              onChange={(e) => {
                takeOver();
                setSize(Number(e.target.value));
              }}
            />
          </div>
        )}

        {showTracking && (
          <div className="pb-axisspecimen-row">
            <div className="pb-axisspecimen-head">
              <label htmlFor={`${uid}-tracking`}>Tracking</label>
              <span className="pb-axisspecimen-val">{trackingEm} em</span>
            </div>
            <input
              id={`${uid}-tracking`}
              className="pb-axisspecimen-range"
              type="range"
              min={trackingRange[0]}
              max={trackingRange[1]}
              step={0.5}
              value={tracking}
              onFocus={takeOver}
              onChange={(e) => {
                takeOver();
                setTracking(Number(e.target.value));
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default AxisSpecimen;
