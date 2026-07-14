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

type Rgb = [number, number, number];

/** Parse "#rgb" / "#rrggbb" into a normalised [r, g, b] triple. */
function hexToRgb(hex: string): Rgb {
  let h = hex.replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const n = Number.parseInt(h, 16);
  if (Number.isNaN(n)) return [0, 0, 0];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Resolve any CSS colour — hex, `rgb()`, `oklch()`, named, or `var(--token)`
 * — to a normalised triple. `var()` is resolved against `host`'s cascade so
 * theme tokens pick up the component's actual theme scope. Client-only;
 * returns `fallback` on SSR or when the colour can't be parsed.
 */
function resolveColor(
  input: string,
  fallback: Rgb,
  host: HTMLElement | null
): Rgb {
  const trimmed = input.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) return hexToRgb(trimmed);
  if (typeof document === "undefined") return fallback;
  try {
    const probe = document.createElement("span");
    probe.style.display = "none";
    probe.style.color = trimmed;
    (host ?? document.body).appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    const cv = document.createElement("canvas");
    cv.width = 1;
    cv.height = 1;
    const ctx = cv.getContext("2d");
    if (!ctx || !resolved) return fallback;
    ctx.fillStyle = resolved;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [(d[0] ?? 0) / 255, (d[1] ?? 0) / 255, (d[2] ?? 0) / 255];
  } catch {
    return fallback;
  }
}

const CAUSTICS_CSS = `
.pb-causticsbackground{position:relative;overflow:hidden;}
.pb-causticsbackground:focus-visible{outline:2px solid var(--pb-causticsbackground-ring,var(--ring,#4cf5e0));outline-offset:2px;}
.pb-causticsbackground-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;}
.pb-causticsbackground-fallback{position:absolute;inset:0;pointer-events:none;background:radial-gradient(130% 100% at 70% 0%,var(--pb-causticsbackground-glow,#0d4a56),var(--pb-causticsbackground-mid,#061a24) 55%,var(--pb-causticsbackground-deep,#05141c));}
.pb-causticsbackground-content{position:relative;z-index:1;}
`;

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

/**
 * Layered domain-loop caustic (five warped sinusoid folds accumulated then
 * folded through 1.17 - c^1.4 and a pow(7) glow) — rippling underwater light.
 * A vertical smoothstep concentrates the light near the top ("surface") and
 * dims it toward the deep; colour is deep→shallow water plus tint * glow.
 */
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_res;
uniform float u_t;
uniform vec3 u_deep;
uniform vec3 u_shallow;
uniform vec3 u_tint;
uniform float u_intensity;

#define TAU 6.28318530718

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 q = mod(p * TAU * 2.15, TAU) - 250.0;
  vec2 i = q;
  float c = 1.0;
  float inten = 0.0045;
  float t = u_t * 0.5 + 20.0;
  for (int n = 0; n < 5; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = q + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(q.x / (sin(i.x + tt) / inten), q.y / (cos(i.y + tt) / inten)));
  }
  c /= 5.0;
  c = 1.17 - pow(c, 1.4);
  float glow = pow(abs(c), 7.0) * u_intensity;
  float depth = smoothstep(-0.15, 1.08, uv.y);
  glow *= 0.22 + 0.78 * depth;
  vec3 col = mix(u_deep, u_shallow, depth) + u_tint * glow;
  col = pow(clamp(col, 0.0, 1.0), vec3(0.92));
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Time (s) of the single static frame drawn under reduced motion. */
const STATIC_T = 8.0;
/** Render cap — caustic light drifts slowly, ~30fps reads identically. */
const FRAME_MS = 33;
/** Device-pixel-ratio cap. The shader is soft; 1.5 is visually lossless. */
const MAX_DPR = 1.5;

export interface CausticsBackgroundProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Caustic light colour. Any CSS colour, including `var(--token)` — CSS
   * variables are resolved against this element's cascade on the client.
   */
  tint?: string;
  /**
   * Deep-water base colour (also painted behind the canvas, so there is no
   * flash before the first GL frame). Accepts `var(--token)` like `tint`.
   */
  background?: string;
  /** Glow strength multiplier. ~0.5 is faint shimmer, 2 is full sunbeams. */
  intensity?: number;
  /** Flow-speed multiplier. 1 is the slow, hero-grade drift. */
  speed?: number;
  /** Idle the render loop (the last frame stays up). */
  paused?: boolean;
}

/**
 * CausticsBackground — a full-bleed underwater-caustics WebGL background
 * (raw WebGL1, one fullscreen triangle, no deps), ported from Parable's
 * Fathom template. Five layered domain-loop folds make rippling biolum
 * light that concentrates near the top edge and dims toward the deep.
 *
 * The single rAF loop renders at ~30fps, pauses when the element scrolls
 * off-screen (IntersectionObserver) and when the tab is hidden
 * (`visibilitychange`), and survives WebGL context loss. Device pixel
 * ratio is capped at 1.5. If a context can't be created at all, a static
 * CSS radial-gradient built from `tint`/`background` takes its place.
 * Under prefers-reduced-motion exactly one lit frame is drawn — no loop.
 * Everything (rAF, observers, listeners, GL objects, the context itself)
 * is torn down on unmount. Children render above via a z-indexed wrapper,
 * same API shape as AuroraBackground / DitherAurora.
 *
 * @parable/caustics-background
 */
export function CausticsBackground({
  tint = "#4cf5e0",
  background = "#041019",
  intensity = 1,
  speed = 1,
  paused = false,
  className,
  children,
  style,
  ...props
}: CausticsBackgroundProps) {
  useInjectedKeyframes("pb-causticsbackground-css", CAUSTICS_CSS);

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const reduced = usePrefersReducedMotion();
  const [failed, setFailed] = React.useState(false);

  // Live-updatable knobs that must not tear down the GL context.
  const live = React.useRef({ speed, intensity, paused });
  live.current.speed = speed;
  live.current.intensity = intensity;
  live.current.paused = paused;

  const colorKey = `${tint}|${background}`;

  React.useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) {
      setFailed(true);
      return;
    }

    const tintRgb = resolveColor(tint, hexToRgb("#4cf5e0"), root);
    const deepRgb = resolveColor(background, hexToRgb("#041019"), root);
    // Near-surface water: the deep colour lifted, leaning toward the tint.
    const shallowRgb = deepRgb.map((c, i) =>
      Math.min(1, c * 1.4 + (tintRgb[i] ?? 0) * 0.04)
    ) as Rgb;

    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let uT: WebGLUniformLocation | null = null;
    let uRes: WebGLUniformLocation | null = null;
    let uIntensity: WebGLUniformLocation | null = null;

    const compile = (type: number, src: string): WebGLShader | null => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const setup = (): boolean => {
      const vs = compile(gl.VERTEX_SHADER, VERT);
      const fs = compile(gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) return false;
      const prog = gl.createProgram();
      if (!prog) return false;
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        gl.deleteProgram(prog);
        return false;
      }
      program = prog;
      gl.useProgram(prog);

      buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW
      );
      const aPos = gl.getAttribLocation(prog, "a_pos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      uT = gl.getUniformLocation(prog, "u_t");
      uRes = gl.getUniformLocation(prog, "u_res");
      uIntensity = gl.getUniformLocation(prog, "u_intensity");
      gl.uniform3f(gl.getUniformLocation(prog, "u_deep"), ...deepRgb);
      gl.uniform3f(gl.getUniformLocation(prog, "u_shallow"), ...shallowRgb);
      gl.uniform3f(gl.getUniformLocation(prog, "u_tint"), ...tintRgb);
      return true;
    };

    let raf = 0;
    let lost = false;
    let visible = true;
    let time = 0;
    let last = 0;
    let lastDraw = 0;

    const draw = (t: number) => {
      if (!program || lost) return;
      gl.uniform1f(uT, t);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uIntensity, Math.max(0, live.current.intensity));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = Math.max(1, Math.round(root.clientWidth * dpr));
      const h = Math.max(1, Math.round(root.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        draw(reduced ? STATIC_T : time);
      }
    };

    const frame = (now: number) => {
      // Fully stop (no reschedule) while off-screen, tab-hidden, or lost.
      if (lost || !visible || document.hidden) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (live.current.paused) return;
      time += dt * live.current.speed;
      if (now - lastDraw < FRAME_MS) return;
      lastDraw = now;
      draw(time);
    };

    const start = () => {
      if (raf || reduced || lost || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => {
      if (!document.hidden) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) start();
    });
    io.observe(root);

    const ro = new ResizeObserver(resize);
    ro.observe(root);

    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      program = null;
      buffer = null;
    };
    const onRestored = () => {
      lost = false;
      if (setup()) {
        setFailed(false);
        gl.viewport(0, 0, canvas.width, canvas.height);
        if (reduced) draw(STATIC_T);
        else start();
      }
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    if (gl.isContextLost()) {
      // React StrictMode (Next.js dev default) double-invokes this effect on the
      // same canvas; the cleanup's loseContext() means the re-run's getContext
      // hands back the same, already-lost context. Ask for a restore and let the
      // webglcontextrestored -> onRestored path run setup() rather than latching
      // the sticky fallback, which never resets once set.
      gl.getExtension("WEBGL_lose_context")?.restoreContext();
    } else if (setup()) {
      resize();
      if (reduced) draw(STATIC_T);
      else start();
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      lost = true;
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      ro.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // colorKey covers `tint` and `background`; speed/intensity/paused apply
    // live via ref without a context teardown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorKey, reduced]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "pb-causticsbackground relative overflow-hidden",
        className
      )}
      style={
        {
          background,
          "--pb-causticsbackground-ring": tint,
          "--pb-causticsbackground-deep": background,
          "--pb-causticsbackground-mid": `color-mix(in oklab, ${tint} 10%, ${background})`,
          "--pb-causticsbackground-glow": `color-mix(in oklab, ${tint} 32%, ${background})`,
          ...style,
        } as React.CSSProperties
      }
      {...props}
    >
      {failed ? (
        <div aria-hidden className="pb-causticsbackground-fallback" />
      ) : (
        // Keyed so colour/motion prop changes remount with a fresh context.
        <canvas
          key={`${colorKey}|${reduced}`}
          ref={canvasRef}
          aria-hidden
          className="pb-causticsbackground-canvas"
        />
      )}
      <div className="pb-causticsbackground-content">{children}</div>
    </div>
  );
}

export default CausticsBackground;
