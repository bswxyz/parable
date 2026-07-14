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

const COMBINATION_DIAL_CSS = `
.pb-combinationdial-dial{cursor:grab;touch-action:none;-webkit-tap-highlight-color:transparent;outline:none;}
.pb-combinationdial-dial.pb-combinationdial-grabbing{cursor:grabbing;}
.pb-combinationdial-ring{transition:transform .5s cubic-bezier(.22,1,.36,1);transform-box:view-box;transform-origin:60px 60px;}
.pb-combinationdial-dial.pb-combinationdial-grabbing .pb-combinationdial-ring{transition:none;}
.pb-combinationdial-face{transition:opacity .28s ease;}
.pb-combinationdial-dial:focus-visible .pb-combinationdial-plate{stroke:var(--pb-combinationdial-accent);stroke-width:2.5;}
.pb-combinationdial-dial:focus-visible{border-radius:9999px;box-shadow:0 0 0 3px color-mix(in oklab, var(--pb-combinationdial-accent) 55%, transparent);}
.pb-combinationdial-reveal{overflow:hidden;transition:grid-template-rows .6s cubic-bezier(.22,1,.36,1),opacity .5s ease .1s;}
.pb-combinationdial-reveal-inner{min-height:0;}
.pb-combinationdial-shackle{transition:transform .7s cubic-bezier(.34,1.56,.64,1);transform-box:fill-box;transform-origin:center bottom;}
@media (prefers-reduced-motion:reduce){
.pb-combinationdial-ring,.pb-combinationdial-face,.pb-combinationdial-reveal,.pb-combinationdial-shackle{transition:none!important;}
}
`;

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** A single dial face: a display value plus an accessible label. */
export interface DialFace {
  /** The value read by `aria-valuetext` and shown under the dial. */
  label: string;
  /** Optional face content (SVG/emoji/text). Falls back to `label`. */
  symbol?: React.ReactNode;
}

/** Per-dial configuration. */
export interface DialConfig {
  /** Accessible name for the dial, e.g. "Dial one of four". */
  label?: string;
  /** Ordered faces this dial cycles through. */
  faces: DialFace[];
}

interface DialProps {
  index: number;
  config: DialConfig;
  value: number;
  solved: boolean;
  size: number;
  accent: string;
  faceColor: string;
  mutedColor: string;
  trackColor: string;
  onChange: (index: number, next: number) => void;
}

/**
 * One rotary dial. `role="spinbutton"`; rotated by pointer drag (angle from the
 * dial centre, with pointer capture) or ArrowUp/Right (+1), ArrowDown/Left (-1),
 * Home (first face), End (last face). Face count = `faces.length`; a full turn is
 * one revolution across all faces. Notch ticks are drawn in SVG.
 */
function Dial({
  index,
  config,
  value,
  solved,
  size,
  accent,
  faceColor,
  mutedColor,
  trackColor,
  onChange,
}: DialProps) {
  const faces = config.faces;
  const count = faces.length;
  const step = 360 / count;
  const ref = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{
    id: number;
    prev: number;
    acc: number;
    startVal: number;
  } | null>(null);
  const [grabbing, setGrabbing] = React.useState(false);
  // Continuous rotation used only while dragging; otherwise snap to value*step.
  const [dragAngle, setDragAngle] = React.useState<number | null>(null);

  const face = faces[mod(value, count)];

  const angleAt = (x: number, y: number) => {
    const el = ref.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return (
      (Math.atan2(y - (r.top + r.height / 2), x - (r.left + r.width / 2)) *
        180) /
      Math.PI
    );
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (solved) return;
    e.preventDefault();
    ref.current?.setPointerCapture(e.pointerId);
    setGrabbing(true);
    drag.current = {
      id: e.pointerId,
      prev: angleAt(e.clientX, e.clientY),
      acc: 0,
      startVal: value,
    };
    setDragAngle(value * step);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const a = angleAt(e.clientX, e.clientY);
    let dd = a - d.prev;
    if (dd > 180) dd -= 360;
    else if (dd < -180) dd += 360;
    d.acc += dd;
    d.prev = a;
    setDragAngle(d.startVal * step + d.acc);
    const next = mod(d.startVal + Math.round(d.acc / step), count);
    if (next !== value) onChange(index, next);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setGrabbing(false);
    setDragAngle(null); // snap ring to the settled face
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (solved) return;
    let handled = true;
    switch (e.key) {
      case "ArrowUp":
      case "ArrowRight":
        onChange(index, mod(value + 1, count));
        break;
      case "ArrowDown":
      case "ArrowLeft":
        onChange(index, mod(value - 1, count));
        break;
      case "Home":
        onChange(index, 0);
        break;
      case "End":
        onChange(index, count - 1);
        break;
      default:
        handled = false;
    }
    if (handled) e.preventDefault();
  };

  const rotation = dragAngle ?? value * step;
  const ticks = Array.from({ length: count }, (_, i) => i);

  return (
    <div className="pb-combinationdial-slot flex flex-col items-center gap-2">
      <div
        ref={ref}
        role="spinbutton"
        tabIndex={0}
        aria-label={config.label ?? `Dial ${index + 1}`}
        aria-valuemin={1}
        aria-valuemax={count}
        aria-valuenow={mod(value, count) + 1}
        aria-valuetext={face?.label}
        aria-disabled={solved || undefined}
        className={cn(
          "pb-combinationdial-dial relative grid place-items-center",
          grabbing && "pb-combinationdial-grabbing"
        )}
        style={{ width: size, height: size }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
      >
        <svg
          viewBox="0 0 120 120"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
          focusable="false"
        >
          {/* fixed pointer marker at 12 o'clock */}
          <path
            d="M60 4 L65 15 L55 15 Z"
            fill={accent}
            className="pb-combinationdial-pointer"
          />
          {/* plate */}
          <circle
            className="pb-combinationdial-plate"
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={solved ? accent : trackColor}
            strokeWidth={solved ? 2 : 1.5}
          />
          {/* rotating ring with notch ticks */}
          <g
            className="pb-combinationdial-ring"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <circle
              cx="60"
              cy="60"
              r="46"
              fill="none"
              stroke={trackColor}
              strokeWidth="1"
              opacity="0.6"
            />
            {ticks.map((i) => {
              const home = i === 0;
              return (
                <line
                  key={i}
                  x1="60"
                  y1={home ? 12 : 14}
                  x2="60"
                  y2={home ? 30 : 24}
                  stroke={home ? accent : mutedColor}
                  strokeWidth={home ? 2.4 : 1.4}
                  strokeLinecap="round"
                  transform={`rotate(${i * step} 60 60)`}
                />
              );
            })}
          </g>
        </svg>
        {/* face symbol (counter-rotates back to upright: it stays centered) */}
        <span
          className="pb-combinationdial-face relative z-10 grid place-items-center"
          style={{
            width: "42%",
            height: "42%",
            color: solved ? accent : faceColor,
          }}
        >
          {face?.symbol ?? face?.label}
        </span>
      </div>
      <span
        aria-hidden="true"
        className="pb-combinationdial-name text-[0.62rem] font-medium uppercase tracking-[0.12em]"
        style={{ color: solved ? accent : mutedColor }}
      >
        {face?.label}
      </span>
    </div>
  );
}

export interface CombinationDialProps
  extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    "onChange" | "children" | "defaultValue"
  > {
  /**
   * The dials, in left-to-right order. Each dial declares its ordered faces.
   * The number of dials is `dials.length`.
   */
  dials: DialConfig[];
  /**
   * Winning face indices, one per dial (same length/order as `dials`). When
   * every dial's value equals this, the lock unlocks.
   */
  combination: number[];
  /** Controlled face indices, one per dial. Provide with `onChange`. */
  value?: number[];
  /** Uncontrolled initial face indices. Defaults to all zeros. */
  defaultValue?: number[];
  /** Called whenever any dial changes (controlled or uncontrolled). */
  onChange?: (value: number[]) => void;
  /** Fired once when the combination is first matched. */
  onUnlock?: () => void;
  /**
   * Revealed content once unlocked. A function receives `{ solved }` so callers
   * can render before/after states; a node is shown only after unlock.
   */
  children?: React.ReactNode | ((state: { solved: boolean }) => React.ReactNode);
  /** Compact hint shown under the dials (e.g. "Drag or use ↑ ↓"). */
  hint?: React.ReactNode;
  /** Diameter of each dial in px. Default 88. */
  dialSize?: number;
  /** Accent colour (pointer, solved glow, focus ring). */
  accentColor?: string;
  /** Face glyph colour. */
  faceColor?: string;
  /** Muted colour for tick marks and labels. */
  mutedColor?: string;
  /** Dial track/plate stroke colour. */
  trackColor?: string;
  /** Show the decorative padlock shackle above the dials. Default true. */
  showShackle?: boolean;
}

/**
 * CombinationDial — a rotary combination-lock control. Renders N dials, each an
 * accessible `role="spinbutton"` you rotate by pointer drag (angle from centre,
 * with pointer capture) or the keyboard (ArrowUp/Right +1, ArrowDown/Left -1,
 * Home/End to the first/last face). Each dial exposes `aria-valuemin/max/now`
 * and `aria-valuetext` (the current face label), a `:focus-visible` ring, and
 * SVG notch ticks. When every dial matches `combination`, `onUnlock` fires once
 * and a latch-open reveal expands to show `children` (node or render prop).
 *
 * Works controlled (`value` + `onChange`) or uncontrolled (`defaultValue`).
 * First render is deterministic and SSR-safe. Under `prefers-reduced-motion`
 * the dials snap without rotation tweening and the reveal appears without
 * transition. Colours default to Parable `--pb-*`-flavoured tokens with literal
 * fallbacks and are overridable via props.
 *
 * @parable/combination-dial
 */
export function CombinationDial({
  dials,
  combination,
  value,
  defaultValue,
  onChange,
  onUnlock,
  children,
  hint,
  dialSize = 88,
  accentColor = "var(--primary, #c9a227)",
  faceColor = "var(--foreground, #f5f5f4)",
  mutedColor = "var(--muted-foreground, #8a8578)",
  trackColor = "var(--border, #3a352c)",
  showShackle = true,
  className,
  style,
  ...props
}: CombinationDialProps) {
  useInjectedKeyframes("pb-combinationdial-kf", COMBINATION_DIAL_CSS);

  const clampToFaces = React.useCallback(
    (arr: number[]) =>
      dials.map((d, i) =>
        d.faces.length ? mod(arr[i] ?? 0, d.faces.length) : 0
      ),
    [dials]
  );

  const isControlled = value != null;
  const [internal, setInternal] = React.useState<number[]>(() =>
    clampToFaces(defaultValue ?? dials.map(() => 0))
  );
  const current = isControlled ? clampToFaces(value) : internal;

  const solved = React.useMemo(
    () =>
      dials.length > 0 &&
      combination.length >= dials.length &&
      current.every((v, i) => v === mod(combination[i] ?? 0, dials[i].faces.length || 1)),
    [current, combination, dials]
  );

  // Fire onUnlock exactly once, on the transition into solved.
  const wasSolved = React.useRef(false);
  React.useEffect(() => {
    if (solved && !wasSolved.current) {
      wasSolved.current = true;
      onUnlock?.();
    }
    if (!solved) wasSolved.current = false;
  }, [solved, onUnlock]);

  const handleChange = React.useCallback(
    (index: number, next: number) => {
      const base = isControlled ? clampToFaces(value) : internal;
      const updated = base.slice();
      updated[index] = next;
      if (!isControlled) setInternal(updated);
      onChange?.(updated);
    },
    [isControlled, value, internal, clampToFaces, onChange]
  );

  // Node children are mounted (collapsed) so the unlock can animate them open,
  // and kept out of the a11y tree until solved. A render prop is fully
  // caller-controlled — use it to gate content out of the DOM before unlock.
  const revealContent =
    typeof children === "function"
      ? (children as (s: { solved: boolean }) => React.ReactNode)({ solved })
      : children;

  const dialCount = dials.length;

  return (
    <div
      className={cn(
        "pb-combination-dial flex w-full max-w-md flex-col items-center gap-6",
        className
      )}
      style={
        {
          "--pb-combinationdial-accent": accentColor,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {showShackle && (
        <svg
          viewBox="0 0 160 70"
          aria-hidden="true"
          focusable="false"
          className="h-10 w-24"
          style={{ color: solved ? accentColor : trackColor }}
        >
          <path
            className="pb-combinationdial-shackle"
            d="M34 68 V40 a46 46 0 0 1 92 0 V68"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            style={{
              transform: solved
                ? "translateY(-10px) rotate(-8deg)"
                : "none",
            }}
          />
        </svg>
      )}

      <div
        role="group"
        aria-label="Combination lock"
        className={cn(
          "grid w-full justify-items-center gap-x-3 gap-y-6",
          dialCount <= 2 && "grid-cols-2",
          dialCount === 3 && "grid-cols-3",
          dialCount >= 4 && "grid-cols-2 sm:grid-cols-4"
        )}
      >
        {dials.map((config, i) => (
          <Dial
            key={i}
            index={i}
            config={config}
            value={current[i] ?? 0}
            solved={solved}
            size={dialSize}
            accent={accentColor}
            faceColor={faceColor}
            mutedColor={mutedColor}
            trackColor={trackColor}
            onChange={handleChange}
          />
        ))}
      </div>

      {hint && (
        <p
          className="pb-combinationdial-hint m-0 text-center text-[0.68rem] uppercase tracking-[0.14em]"
          style={{ color: mutedColor }}
        >
          {hint}
        </p>
      )}

      <span role="status" aria-live="polite" className="sr-only">
        {solved ? "Unlocked." : "Locked."}
      </span>

      {revealContent != null && (
        <div
          className="pb-combinationdial-reveal grid w-full"
          aria-hidden={!solved || undefined}
          inert={!solved || undefined}
          style={{
            gridTemplateRows: solved ? "1fr" : "0fr",
            opacity: solved ? 1 : 0,
          }}
        >
          <div className="pb-combinationdial-reveal-inner">{revealContent}</div>
        </div>
      )}
    </div>
  );
}

export default CombinationDial;
