"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Inject a <style> block once per unique id (SSR-safe, idempotent). */
function useInjectedKeyframes(id: string, css: string) {
  React.useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/** Track prefers-reduced-motion reactively (defaults to false on the server). */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

/**
 * mulberry32 — a tiny deterministic PRNG. Seeded once per build from a fixed
 * constant so the first painted frame is identical run-to-run (no
 * `Math.random()` at module or render scope), yet advances freely afterward.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/** Half-width katakana + digits + latin — the canonical "digital rain" set. */
const DEFAULT_GLYPHS =
  "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:.=*+-<>ｦﾎﾃﾏｹ";

const HEAD_COLOR = "#ffffff";
const SEED = 0x9e3779b9;
const DPR_CAP = 2;

interface RainState {
  cols: number;
  rows: number;
  cssW: number;
  cssH: number;
  cells: Uint16Array; // glyph index per grid cell, laid out col-major
  headY: Float32Array; // head row position per column (float, may be < 0)
  vel: Float32Array; // fall speed per column, rows per second
  len: Int32Array; // trail length per column, in cells
  lastRow: Int32Array; // last integer head row, drives glyph reveal
  rng: () => number;
}

export interface MatrixRainProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Glyph colour for the falling trail. Head cells stay near-white and glow in
   * this colour. Defaults to Parable signal cyan `#22d3ee` (mirrors the site's
   * `--pb-signal` token). Any CSS colour string works.
   */
  color?: string;
  /** Character pool the columns draw from. Defaults to katakana + digits. */
  glyphs?: string;
  /** Cell size in CSS pixels — sets both the font size and column pitch. */
  fontSize?: number;
  /** Fall-speed multiplier. `1` is a lively rain; `0` freezes mid-fall. */
  speed?: number;
  /**
   * Trail fade factor. Higher fades trails shorter (roughly `1 / fade` cells),
   * lower leaves long comet tails. Defaults to `0.08`.
   */
  fade?: number;
}

/**
 * MatrixRain — the falling-glyph "digital rain" on a single canvas. Columns of
 * monospace glyphs cascade downward: the head cell is bright white with a
 * coloured glow, the trail fades along a power curve, and glyphs mutate in place
 * as the rain falls. One `requestAnimationFrame` loop drives everything with a
 * DPR-capped, resize-aware backing store (`ResizeObserver`), and an
 * `IntersectionObserver` idles the loop while off-screen. Column layout and the
 * opening frame come from a fixed-seed PRNG, so the first client frame is
 * deterministic and never calls `Math.random()` at module or render scope.
 * Under `prefers-reduced-motion` a single static frame of dim glyphs is painted
 * with no fall. The canvas is `aria-hidden` decoration; `children` render above
 * it through a relative `z-10` layer.
 *
 * Colour default mirrors the site's `--pb-*` tokens (signal cyan `#22d3ee`).
 *
 * @parable/matrix-rain
 */
export function MatrixRain({
  color = "#22d3ee",
  glyphs = DEFAULT_GLYPHS,
  fontSize = 16,
  speed = 1,
  fade = 0.08,
  className,
  children,
  ...props
}: MatrixRainProps) {
  useInjectedKeyframes(
    "pb-matrix-rain-kf",
    ".pb-matrix-rain-canvas{opacity:0;animation:pb-matrix-rain-in .6s cubic-bezier(.22,1,.36,1) forwards}" +
      "@keyframes pb-matrix-rain-in{to{opacity:1}}" +
      "@media (prefers-reduced-motion:reduce){.pb-matrix-rain-canvas{animation:none;opacity:1}}"
  );

  const reduced = useReducedMotion();
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Live knobs the loop reads each frame without a rebuild.
  const colorRef = React.useRef(color);
  const speedRef = React.useRef(speed);
  const fadeRef = React.useRef(fade);
  colorRef.current = color;
  speedRef.current = speed;
  fadeRef.current = fade;

  const fs = clamp(Math.round(fontSize) || 16, 6, 96);
  const glyphChars = React.useMemo(
    () => (Array.from(glyphs).length ? Array.from(glyphs) : Array.from(DEFAULT_GLYPHS)),
    [glyphs]
  );

  React.useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const glyphCount = glyphChars.length;
    let st: RainState | null = null;

    /** Base trail length in cells, derived from the current `fade`. */
    const baseLen = (rows: number) =>
      clamp(Math.round(1 / clamp(fadeRef.current, 0.02, 1)), 4, rows);

    /** (Re)size the backing store and rebuild the deterministic grid. */
    const build = () => {
      const cssW = root.clientWidth;
      const cssH = root.clientHeight;
      if (cssW <= 0 || cssH <= 0) {
        st = null;
        return;
      }
      const dpr = Math.min(DPR_CAP, window.devicePixelRatio || 1);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = `${fs}px ui-monospace, SFMono-Regular, Menlo, "Cascadia Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const cols = Math.max(1, Math.ceil(cssW / fs));
      const rows = Math.max(1, Math.ceil(cssH / fs) + 1);
      const rng = mulberry32(SEED);
      const cells = new Uint16Array(cols * rows);
      for (let i = 0; i < cells.length; i++)
        cells[i] = (rng() * glyphCount) | 0;

      const headY = new Float32Array(cols);
      const vel = new Float32Array(cols);
      const len = new Int32Array(cols);
      const lastRow = new Int32Array(cols);
      const bl = baseLen(rows);
      for (let c = 0; c < cols; c++) {
        // Stagger starts above the top so the rain streams in.
        headY[c] = reduced
          ? rng() * rows * 0.7 + rows * 0.12
          : -rng() * rows - 1;
        vel[c] = 5.5 + rng() * 7.5;
        len[c] = clamp(Math.round(bl * (0.7 + rng() * 0.7)), 3, rows);
        lastRow[c] = Math.floor(headY[c]);
      }
      st = { cols, rows, cssW, cssH, cells, headY, vel, len, lastRow, rng };
    };

    /** Paint one frame. `dim` scales alpha for the reduced-motion still. */
    const draw = (dim: number) => {
      if (!st) return;
      const { cols, rows, cssW, cssH, cells, headY, len } = st;
      ctx.clearRect(0, 0, cssW, cssH);
      const trailColor = colorRef.current;
      ctx.fillStyle = trailColor;
      const half = fs / 2;
      for (let c = 0; c < cols; c++) {
        const headRow = Math.floor(headY[c]);
        const l = len[c];
        const x = c * fs + half;
        for (let k = 0; k < l; k++) {
          const rIdx = headRow - k;
          if (rIdx < 0) break; // higher k only goes further above the top
          if (rIdx >= rows) continue; // head still below the viewport
          const ch = glyphChars[cells[c * rows + rIdx]];
          const y = rIdx * fs + half;
          if (k === 0) {
            ctx.globalAlpha = clamp(0.95 * dim + 0.05, 0, 1);
            ctx.fillStyle = HEAD_COLOR;
            ctx.shadowColor = trailColor;
            ctx.shadowBlur = fs * 0.85;
            ctx.fillText(ch, x, y);
            ctx.shadowBlur = 0;
            ctx.fillStyle = trailColor;
          } else {
            const a = Math.pow(1 - k / l, 1.5) * dim;
            if (a <= 0.02) continue;
            ctx.globalAlpha = a;
            ctx.fillText(ch, x, y);
          }
        }
      }
      ctx.globalAlpha = 1;
    };

    const ro = new ResizeObserver(() => {
      build();
      if (reduced) draw(0.55);
    });
    ro.observe(root);
    build();

    // Reduced motion: one dim static frame, no loop.
    if (reduced) {
      draw(0.55);
      return () => ro.disconnect();
    }

    let raf = 0;
    let visible = true;
    let last = performance.now();

    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      if (!visible || !st) {
        last = now;
        return;
      }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const spd = Math.max(0, speedRef.current);
      const { cols, rows, cells, headY, vel, len, lastRow, rng } = st;

      for (let c = 0; c < cols; c++) {
        headY[c] += vel[c] * spd * dt;
        const cur = Math.floor(headY[c]);
        if (cur !== lastRow[c]) {
          // Reveal fresh glyphs on every newly-entered cell.
          const from = Math.max(lastRow[c] + 1, 0);
          const to = Math.min(cur, rows - 1);
          for (let r = from; r <= to; r++)
            cells[c * rows + r] = (rng() * glyphCount) | 0;
          lastRow[c] = cur;
        }
        // Recycle a column once its whole trail has fallen past the bottom.
        if (headY[c] - len[c] > rows + 1) {
          headY[c] = -rng() * rows * 0.5 - 1;
          vel[c] = 5.5 + rng() * 7.5;
          len[c] = clamp(
            Math.round(baseLen(rows) * (0.7 + rng() * 0.7)),
            3,
            rows
          );
          lastRow[c] = Math.floor(headY[c]);
        }
      }

      // Mutate a handful of visible glyphs so the field shimmers.
      const mut = Math.ceil(cols * 0.06);
      for (let i = 0; i < mut; i++) {
        const idx = (rng() * cells.length) | 0;
        cells[idx] = (rng() * glyphCount) | 0;
      }

      draw(1);
    };

    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    });
    io.observe(root);

    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [reduced, fs, glyphChars]);

  return (
    <div
      ref={rootRef}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pb-matrix-rain-canvas pointer-events-none absolute inset-0 h-full w-full"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default MatrixRain;
