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

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Deterministic PRNG (mulberry32) — identical sequences on server and client. */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Procedural "spoken word" peaks: phrase-level energy shifts, syllable ripple,
 * and occasional near-silent breaths. Deterministic per seed and quantized to
 * 3 decimals (Math.sin can differ by 1 ulp between engines, and the SSR
 * fallback renders on server AND client).
 */
function buildPeaks(seed: number, n: number): number[] {
  const rnd = mulberry32(seed);
  const q = (v: number) => Math.round(v * 1000) / 1000;
  const peaks: number[] = [];
  let energy = 0.55 + rnd() * 0.25;
  let pause = 0;
  for (let i = 0; i < n; i++) {
    if (pause > 0) {
      pause--;
      peaks.push(q(0.05 + rnd() * 0.05));
      continue;
    }
    if (rnd() < 0.014) pause = 3 + Math.floor(rnd() * 12); // breaths, beats
    if (rnd() < 0.06) energy = 0.35 + rnd() * 0.6; // a new phrase lands
    const syllable = 0.55 + 0.45 * Math.sin(i * 0.9 + rnd() * 2);
    const v = energy * syllable * (0.72 + rnd() * 0.28);
    peaks.push(q(Math.max(0.06, Math.min(1, v))));
  }
  return peaks;
}

/** Round for SVG attributes so server and client markup match exactly. */
const r2 = (v: number) => Math.round(v * 100) / 100;

/** m:ss, or h:mm:ss past the hour. */
function formatTime(s: number): string {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

const WAVEFORM_SCRUBBER_CSS = `
.pb-waveformscrubber{display:flex;flex-direction:column;gap:10px;width:100%;}
.pb-waveformscrubber-stage{position:relative;width:100%;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none;border-radius:10px;outline:none;}
.pb-waveformscrubber-stage:focus-visible{outline:2px solid var(--pb-ws-accent,#171717);outline-offset:3px;}
.pb-waveformscrubber-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}
.pb-waveformscrubber-fallback{position:absolute;inset:0;width:100%;height:100%;color:var(--pb-ws-inactive,#8a8a8a);}
.pb-waveformscrubber-hidden{visibility:hidden;}
.pb-waveformscrubber-row{display:flex;align-items:center;gap:12px;}
.pb-waveformscrubber-btn{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;flex:0 0 auto;padding:0;border-radius:9999px;border:1px solid var(--pb-ws-inactive,#8a8a8a);background:transparent;color:var(--pb-ws-accent,#171717);cursor:pointer;transition:transform .15s ease,border-color .15s ease;}
.pb-waveformscrubber-btn:hover{border-color:var(--pb-ws-accent,#171717);}
.pb-waveformscrubber-btn:active{transform:scale(.94);}
.pb-waveformscrubber-btn:focus-visible{outline:2px solid var(--pb-ws-accent,#171717);outline-offset:2px;}
.pb-waveformscrubber-btn svg{width:14px;height:14px;fill:currentColor;}
.pb-waveformscrubber-time{display:flex;flex:1 1 auto;justify-content:space-between;align-items:baseline;font-size:12px;line-height:1;font-variant-numeric:tabular-nums;}
.pb-waveformscrubber-elapsed{color:var(--pb-ws-accent,#171717);}
.pb-waveformscrubber-total{color:var(--pb-ws-inactive,#8a8a8a);}
@media (prefers-reduced-motion:reduce){.pb-waveformscrubber-btn{transition:none;}}
`;

const FALLBACK_BARS = 96;
const PROCEDURAL_PEAKS = 240;

export interface WaveformScrubberProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Explicit peak amplitudes (0–1). When provided, wins over `seed`. */
  peaks?: number[];
  /** Seed for the procedural waveform. Deterministic across SSR and client. */
  seed?: number;
  /** Total duration in seconds. */
  duration?: number;
  /** Controlled playhead position in seconds. When set, the internal transport stops self-advancing — drive time from the parent and listen to `onSeek`. */
  currentTime?: number;
  /** Initial playhead position (uncontrolled), in seconds. */
  defaultTime?: number;
  /** Controlled playing state. Pair with `onPlayPause`. */
  playing?: boolean;
  /** Initial playing state (uncontrolled). */
  defaultPlaying?: boolean;
  /** Fires with the target time (seconds) on every user seek: click, drag, or keyboard. */
  onSeek?: (seconds: number) => void;
  /** Fires with the requested state when the user toggles play/pause, and with `false` when playback reaches the end. */
  onPlayPause?: (playing: boolean) => void;
  /** Played-region / playhead colour. Any CSS colour, `var()` welcome. */
  accentColor?: string;
  /** Unplayed-region colour. Any CSS colour, `var()` welcome. */
  inactiveColor?: string;
  /** Waveform height in px. */
  height?: number;
  /** Width of each waveform bar in px. */
  barWidth?: number;
  /** Gap between bars in px. */
  barGap?: number;
  /** Hide the play button + time readout row. */
  hideControls?: boolean;
  /** Accessible label for the scrub surface. */
  label?: string;
}

/**
 * WaveformScrubber — a seekable audio-waveform scrubber on `<canvas>`.
 * Symmetric peaks are procedurally generated from a numeric `seed` (or pass
 * real `peaks`), a simulated transport advances the playhead while playing,
 * and bars near the playhead shimmer. Click or drag (pointer capture) to
 * seek; when focused, Space/Enter toggles play, arrows nudge ±5 s (Shift
 * ±30 s), PageUp/Down ±60 s, Home/End jump. The scrub surface is a
 * `role="slider"` with live `aria-value*`. Time and play state are each
 * controllable (`currentTime`/`playing`) or uncontrolled, with
 * `onSeek`/`onPlayPause` callbacks.
 *
 * Colours default to Parable tokens (`--foreground` / `--muted-foreground`)
 * resolved at draw time, so the canvas follows theme switches. Before
 * hydration a deterministic inline-SVG wave renders in place of the canvas —
 * markup is SSR-stable. Under `prefers-reduced-motion` there is no rAF loop
 * and no shimmer: the wave is a static frame and the playhead jumps once per
 * second while playing.
 *
 * @parable/waveform-scrubber
 */
export const WaveformScrubber = React.forwardRef<
  HTMLDivElement,
  WaveformScrubberProps
>(function WaveformScrubber(
  {
    peaks,
    seed = 1,
    duration = 180,
    currentTime,
    defaultTime = 0,
    playing,
    defaultPlaying = false,
    onSeek,
    onPlayPause,
    accentColor = "var(--foreground, #171717)",
    inactiveColor = "var(--muted-foreground, #8a8a8a)",
    height = 96,
    barWidth = 3,
    barGap = 2,
    hideControls = false,
    label = "Audio position",
    className,
    style,
    ...props
  },
  ref
) {
  useInjectedKeyframes("pb-waveformscrubber-css", WAVEFORM_SCRUBBER_CSS);
  const reduced = usePrefersReducedMotion();

  const dur = Math.max(1, duration);
  const timeControlled = currentTime !== undefined;
  const playingControlled = playing !== undefined;

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const [mounted, setMounted] = React.useState(false);
  const [playingState, setPlayingState] = React.useState(defaultPlaying);
  const isPlaying = playingControlled ? !!playing : playingState;
  const [elapsedSec, setElapsedSec] = React.useState(() =>
    Math.floor(clamp(currentTime ?? defaultTime, 0, dur))
  );

  const resolvedPeaks = React.useMemo(() => {
    if (peaks && peaks.length > 0) return peaks.map((p) => clamp(p, 0, 1));
    return buildPeaks(seed, PROCEDURAL_PEAKS);
  }, [peaks, seed]);

  // Latest-value refs so the rAF loop / observers never go stale.
  const peaksRef = React.useRef(resolvedPeaks);
  peaksRef.current = resolvedPeaks;
  const durRef = React.useRef(dur);
  durRef.current = dur;
  const playingRef = React.useRef(isPlaying);
  playingRef.current = isPlaying;
  const timeControlledRef = React.useRef(timeControlled);
  timeControlledRef.current = timeControlled;
  const playingControlledRef = React.useRef(playingControlled);
  playingControlledRef.current = playingControlled;
  const onSeekRef = React.useRef(onSeek);
  onSeekRef.current = onSeek;
  const onPlayPauseRef = React.useRef(onPlayPause);
  onPlayPauseRef.current = onPlayPause;
  const barRef = React.useRef({ w: barWidth, gap: barGap });
  barRef.current = { w: Math.max(1, barWidth), gap: Math.max(0, barGap) };
  const reducedRef = React.useRef(reduced);
  reducedRef.current = reduced;

  const elapsedRef = React.useRef(clamp(currentTime ?? defaultTime, 0, dur));
  const draggingRef = React.useRef(false);
  const visibleRef = React.useRef(true);
  const colorsRef = React.useRef({ accent: "#171717", inactive: "#8a8a8a" });

  /* ---------- colours: resolve the CSS vars against the live theme ---------- */
  const refreshColors = React.useCallback(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;
    const cs = getComputedStyle(root);
    const read = (name: string, fall: string) =>
      cs.getPropertyValue(name).trim() || fall;
    colorsRef.current = {
      accent: read("--pb-ws-accent", "#171717"),
      inactive: read("--pb-ws-inactive", "#8a8a8a"),
    };
  }, []);

  /* ---------- the canvas (tSec > 0 = animated frame with shimmer) ---------- */
  const draw = React.useCallback((tSec: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pw = Math.max(1, Math.floor(w * dpr));
    const ph = Math.max(1, Math.floor(h * dpr));
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const c = colorsRef.current;
    const pk = peaksRef.current;
    const { w: bw, gap } = barRef.current;
    const slot = bw + gap;
    const progress = clamp(elapsedRef.current / durRef.current, 0, 1);
    const playedX = progress * w;
    const count = Math.max(16, Math.floor(w / slot));
    const mid = h / 2;
    const halfMax = mid - 2;
    const headBar = playedX / slot;
    const animated = tSec > 0;
    const playingNow = playingRef.current;

    for (let i = 0; i < count; i++) {
      // average the peak window this bar covers
      const a0 = Math.floor((i / count) * pk.length);
      const a1 = Math.max(a0 + 1, Math.floor(((i + 1) / count) * pk.length));
      let amp = 0;
      for (let j = a0; j < a1; j++) amp += pk[j];
      amp /= a1 - a0;

      if (animated) {
        if (playingNow) {
          // bars near the playhead shimmer while playing
          const d = i - headBar;
          amp *= 1 + 0.16 * Math.exp((-d * d) / 42) * Math.sin(tSec * 7 + i * 0.8);
        } else {
          // faint idle breathing (killed entirely under reduced motion)
          amp *= 1 + 0.035 * Math.sin(tSec * 1.4 + i * 0.5);
        }
      }

      const x = i * slot;
      const half = Math.max(1.25, clamp(amp, 0, 1.2) * halfMax);
      ctx.fillStyle = x + bw <= playedX ? c.accent : c.inactive;
      ctx.fillRect(x, mid - half, bw, half * 2);
    }

    // playhead: hairline + a knocked-out handle that reads on any backdrop
    ctx.fillStyle = c.accent;
    ctx.fillRect(playedX - 0.75, 0, 1.5, h);
    const hx = clamp(playedX, 5, w - 5);
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(hx, mid, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.arc(hx, mid, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = c.accent;
    ctx.fill();
  }, []);
  const drawRef = React.useRef(draw);
  drawRef.current = draw;

  /* ---------- transport plumbing ---------- */
  const endPlayback = React.useCallback(() => {
    if (!playingControlledRef.current) {
      playingRef.current = false;
      setPlayingState(false);
    }
    setElapsedSec(Math.floor(elapsedRef.current));
    drawRef.current(0);
    onPlayPauseRef.current?.(false);
  }, []);

  const commitSeek = React.useCallback((sec: number) => {
    const next = clamp(sec, 0, durRef.current);
    if (!timeControlledRef.current) {
      elapsedRef.current = next;
      setElapsedSec(Math.floor(next));
      drawRef.current(0);
    }
    onSeekRef.current?.(next);
  }, []);

  const togglePlay = React.useCallback(() => {
    const next = !playingRef.current;
    if (
      next &&
      !timeControlledRef.current &&
      elapsedRef.current >= durRef.current
    ) {
      elapsedRef.current = 0; // replay from the top
      setElapsedSec(0);
    }
    if (!playingControlledRef.current) {
      playingRef.current = next;
      setPlayingState(next);
      if (!next) drawRef.current(0); // settle a shimmer-free frame
    }
    onPlayPauseRef.current?.(next);
  }, []);

  /* ---------- controlled time follows the prop ---------- */
  React.useEffect(() => {
    if (currentTime === undefined) return;
    elapsedRef.current = clamp(currentTime, 0, dur);
    setElapsedSec(Math.floor(elapsedRef.current));
    drawRef.current(0);
  }, [currentTime, dur]);

  /* ---------- data / colour props changed: repaint ---------- */
  React.useEffect(() => {
    elapsedRef.current = clamp(elapsedRef.current, 0, dur);
    refreshColors();
    drawRef.current(0);
  }, [resolvedPeaks, dur, accentColor, inactiveColor, height, refreshColors]);

  /* ---------- mount: first paint + observers ---------- */
  React.useEffect(() => {
    setMounted(true);
    refreshColors();
    drawRef.current(0);

    // theme switches (class or data-theme on <html>) recolour the canvas
    const mo = new MutationObserver(() => {
      refreshColors();
      drawRef.current(0);
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });

    const ro = new ResizeObserver(() => drawRef.current(0));
    if (canvasRef.current) ro.observe(canvasRef.current);

    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== "undefined" && stageRef.current) {
      io = new IntersectionObserver(([e]) => {
        visibleRef.current = e.isIntersecting;
      });
      io.observe(stageRef.current);
    }
    return () => {
      mo.disconnect();
      ro.disconnect();
      io?.disconnect();
    };
  }, [refreshColors]);

  /* ---------- the rAF transport (~30 fps; never runs under reduced motion) ---------- */
  React.useEffect(() => {
    if (reduced) {
      drawRef.current(0);
      return;
    }
    let raf = 0;
    let last = performance.now();
    let acc = 99;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(100, now - last);
      last = now;
      if (
        playingRef.current &&
        !timeControlledRef.current &&
        elapsedRef.current < durRef.current
      ) {
        elapsedRef.current = Math.min(
          durRef.current,
          elapsedRef.current + dt / 1000
        );
        if (elapsedRef.current >= durRef.current) endPlayback();
      }
      acc += dt;
      if (acc >= 33 && visibleRef.current) {
        acc = 0;
        drawRef.current(now / 1000);
        setElapsedSec(Math.floor(elapsedRef.current));
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced, endPlayback]);

  /* ---------- reduced motion: playhead jumps once per second, no shimmer ---------- */
  React.useEffect(() => {
    if (!reduced) return;
    const id = window.setInterval(() => {
      if (
        !playingRef.current ||
        timeControlledRef.current ||
        elapsedRef.current >= durRef.current
      )
        return;
      elapsedRef.current = Math.min(durRef.current, elapsedRef.current + 1);
      setElapsedSec(Math.floor(elapsedRef.current));
      if (elapsedRef.current >= durRef.current) endPlayback();
      else drawRef.current(0);
    }, 1000);
    return () => window.clearInterval(id);
  }, [reduced, endPlayback]);

  /* ---------- seeking: pointer (with capture) + keyboard ---------- */
  const seekFromPointer = React.useCallback(
    (clientX: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (rect.width === 0) return;
      const frac = clamp((clientX - rect.left) / rect.width, 0, 1);
      commitSeek(frac * durRef.current);
    },
    [commitSeek]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromPointer(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) seekFromPointer(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* capture may already be gone */
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 30 : 5;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp")
      next = elapsedRef.current + step;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown")
      next = elapsedRef.current - step;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = durRef.current;
    else if (e.key === "PageUp") next = elapsedRef.current + 60;
    else if (e.key === "PageDown") next = elapsedRef.current - 60;
    else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      togglePlay();
      return;
    }
    if (next !== null) {
      e.preventDefault();
      commitSeek(next);
    }
  };

  /* ---------- no-JS / pre-hydration fallback wave (deterministic SVG) ---------- */
  const fallbackBars = React.useMemo(() => {
    const bars: number[] = [];
    for (let i = 0; i < FALLBACK_BARS; i++) {
      const a0 = Math.floor((i / FALLBACK_BARS) * resolvedPeaks.length);
      const a1 = Math.max(
        a0 + 1,
        Math.floor(((i + 1) / FALLBACK_BARS) * resolvedPeaks.length)
      );
      let amp = 0;
      for (let j = a0; j < a1; j++) amp += resolvedPeaks[j];
      bars.push(r2(amp / (a1 - a0)));
    }
    return bars;
  }, [resolvedPeaks]);

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref]
  );

  return (
    <div
      ref={setRefs}
      className={cn("pb-waveformscrubber", className)}
      style={
        {
          "--pb-ws-accent": accentColor,
          "--pb-ws-inactive": inactiveColor,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      <div
        ref={stageRef}
        className="pb-waveformscrubber-stage"
        style={{ height }}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={Math.round(dur)}
        aria-valuenow={elapsedSec}
        aria-valuetext={`${formatTime(elapsedSec)} of ${formatTime(dur)}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <svg
          className={cn(
            "pb-waveformscrubber-fallback",
            mounted && "pb-waveformscrubber-hidden"
          )}
          viewBox={`0 0 ${FALLBACK_BARS * 5} 100`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          {fallbackBars.map((a, i) => {
            const half = r2(Math.max(1.5, a * 46));
            return (
              <rect
                key={i}
                x={i * 5}
                y={r2(50 - half)}
                width={3}
                height={r2(half * 2)}
                fill="currentColor"
              />
            );
          })}
        </svg>
        <canvas
          ref={canvasRef}
          className="pb-waveformscrubber-canvas"
          aria-hidden="true"
        />
      </div>

      {!hideControls && (
        <div className="pb-waveformscrubber-row">
          <button
            type="button"
            className="pb-waveformscrubber-btn"
            onClick={togglePlay}
            aria-pressed={isPlaying}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="6" y="5" width="4.5" height="14" rx="1" />
                <rect x="13.5" y="5" width="4.5" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5.5v13a1 1 0 0 0 1.52.86l10.2-6.5a1 1 0 0 0 0-1.7L9.52 4.63A1 1 0 0 0 8 5.5Z" />
              </svg>
            )}
          </button>
          <div className="pb-waveformscrubber-time" style={{ fontFamily: MONO }}>
            <span className="pb-waveformscrubber-elapsed">
              {formatTime(elapsedSec)}
            </span>
            <span className="pb-waveformscrubber-total">{formatTime(dur)}</span>
          </div>
        </div>
      )}
    </div>
  );
});

export default WaveformScrubber;
