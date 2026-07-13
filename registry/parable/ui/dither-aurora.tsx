"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Parse "#rgb" / "#rrggbb" into a normalised [r, g, b] triple. */
function hexToRgb(hex: string): [number, number, number] {
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

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

/**
 * Two-octave value noise, domain-warped into a slow curl-like flow, mapped
 * onto a three-stop gradient, then ordered-dithered: each channel is
 * quantised to six levels and a 4x4 Bayer offset rounds the low bits so the
 * field renders as a visible pixel lattice instead of banding.
 */
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_par;
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_bg;
uniform float u_px;
uniform float u_grain;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  return 0.625 * vnoise(p) + 0.375 * vnoise(p * 2.13 + 17.7);
}

/* 2x2 Bayer index: [[0,2],[3,1]] via 2*(x xor y) + y. */
float bayer2(vec2 p) {
  return 2.0 * mod(p.x + p.y, 2.0) + p.y;
}

/* Recursive 4x4 Bayer, normalised to (0, 1). */
float bayer4(vec2 p) {
  vec2 q = floor(mod(p, 4.0));
  return (4.0 * bayer2(mod(q, 2.0)) + bayer2(floor(q * 0.5)) + 0.5) / 16.0;
}

void main() {
  float px = max(u_px, 1.0);
  vec2 cell = floor(gl_FragCoord.xy / px);
  vec2 sp = (cell + 0.5) * px / u_res;
  vec2 uv = vec2(sp.x * u_res.x / u_res.y, sp.y) + u_par;

  float t = u_time;
  vec2 drift = vec2(t * 0.35, -t * 0.22);

  vec2 q = vec2(
    fbm(uv * 1.6 + drift),
    fbm(uv * 1.6 - drift.yx + 4.2)
  );
  float n = fbm(uv * 2.1 + (q - 0.5) * 1.5 + vec2(-t * 0.28, t * 0.19));

  vec2 v = sp - 0.5;
  n *= 1.0 - dot(v, v) * 0.55;

  float m = smoothstep(0.34, 0.8, n);
  vec3 aurora = mix(u_c0, u_c1, smoothstep(0.1, 0.62, m));
  aurora = mix(aurora, u_c2, smoothstep(0.62, 0.96, m));
  vec3 col = mix(u_bg, aurora, m * 0.92);

  float d = bayer4(cell) - 0.5;
  col = clamp(col, 0.0, 1.0);
  col = floor(col * 5.0 + 0.5 + d) / 5.0;

  col += (hash21(gl_FragCoord.xy + fract(t) * 61.7) - 0.5) * 0.05 * u_grain;

  gl_FragColor = vec4(col, 1.0);
}
`;

export interface DitherAuroraProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Two or three hex colours the aurora gradient sweeps through. */
  colors?: string[];
  /** Base backdrop colour (also the GL clear colour). */
  background?: string;
  /** Flow speed multiplier. ~0.15 is a slow, hero-grade drift. */
  speed?: number;
  /** Dither cell size in device pixels — the size of one lattice dot. */
  pixelSize?: number;
  /** Freeze the flow (rendering idles; the last frame stays up). */
  paused?: boolean;
  /** Add a subtle animated film-grain pass on top of the lattice. */
  grain?: boolean;
}

/**
 * DitherAurora — "Prism Drift", Parable's signature hero. A WebGL
 * ordered-dither aurora: two-octave value noise is domain-warped into a slow
 * curl-like flow, mapped onto a three-stop gradient, then quantised through a
 * 4x4 Bayer matrix so it renders as a visible pixel lattice — craft, not
 * banding. Pointer parallax is spring-smoothed (~2.5% drift); the single rAF
 * loop pauses off-screen via IntersectionObserver, devicePixelRatio is capped
 * at 2, and WebGL context loss is survived. Under prefers-reduced-motion it
 * renders exactly one static frame. Default palette (violet / fuchsia / ember
 * on ink) mirrors the site's --pb-* tokens. Content renders above via a
 * relative z-10 wrapper, same API shape as AuroraBackground.
 *
 * @parable/dither-aurora
 */
export function DitherAurora({
  colors = ["#8b5cf6", "#ec4899", "#f5a623"],
  background = "#0f0f10",
  speed = 0.15,
  pixelSize = 4,
  paused = false,
  grain = false,
  className,
  children,
  style,
  ...props
}: DitherAuroraProps) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const reduced = usePrefersReducedMotion();

  // Live-updatable knobs that must not tear down the GL context.
  const live = React.useRef({ speed, paused });
  live.current.speed = speed;
  live.current.paused = paused;

  const colorKey = `${colors.join("|")}|${background}`;

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
    if (!gl) return;

    const stops = colors.filter(Boolean).map(hexToRgb);
    const c0 = stops[0] ?? hexToRgb("#8b5cf6");
    const c1 = stops[1] ?? c0;
    const c2 = stops[2] ?? c1;
    const bg = hexToRgb(background);

    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let uTime: WebGLUniformLocation | null = null;
    let uRes: WebGLUniformLocation | null = null;
    let uPar: WebGLUniformLocation | null = null;

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

      uTime = gl.getUniformLocation(prog, "u_time");
      uRes = gl.getUniformLocation(prog, "u_res");
      uPar = gl.getUniformLocation(prog, "u_par");
      gl.uniform3f(gl.getUniformLocation(prog, "u_c0"), c0[0], c0[1], c0[2]);
      gl.uniform3f(gl.getUniformLocation(prog, "u_c1"), c1[0], c1[1], c1[2]);
      gl.uniform3f(gl.getUniformLocation(prog, "u_c2"), c2[0], c2[1], c2[2]);
      gl.uniform3f(gl.getUniformLocation(prog, "u_bg"), bg[0], bg[1], bg[2]);
      gl.uniform1f(
        gl.getUniformLocation(prog, "u_px"),
        Math.max(1, pixelSize)
      );
      gl.uniform1f(gl.getUniformLocation(prog, "u_grain"), grain ? 1 : 0);
      return true;
    };

    let raf = 0;
    let lost = false;
    let visible = true;
    let time = Math.random() * 40;
    let last = performance.now();
    const STATIC_T = 6.4;

    // Pointer parallax, integrated as a spring in the render loop.
    const par = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
    const STIFFNESS = 200;
    const DAMPING = 22;

    const draw = (t: number, ox: number, oy: number) => {
      if (!program || lost) return;
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uPar, ox, oy);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(root.clientWidth * dpr));
      const h = Math.max(1, Math.round(root.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        draw(reduced ? STATIC_T : time, par.x, par.y);
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (lost || !visible || live.current.paused) return;

      time += dt * live.current.speed;

      par.vx += (par.tx - par.x) * STIFFNESS * dt;
      par.vy += (par.ty - par.y) * STIFFNESS * dt;
      const decay = Math.exp(-DAMPING * dt);
      par.vx *= decay;
      par.vy *= decay;
      par.x += par.vx * dt;
      par.y += par.vy * dt;

      draw(time, par.x, par.y);
    };

    const onPointerMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      if (!r.width || !r.height) return;
      par.tx = ((e.clientX - r.left) / r.width - 0.5) * 0.05;
      par.ty = (0.5 - (e.clientY - r.top) / r.height) * 0.05;
    };
    const onPointerLeave = () => {
      par.tx = 0;
      par.ty = 0;
    };

    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      program = null;
      buffer = null;
    };
    const onRestored = () => {
      lost = false;
      if (setup()) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        draw(reduced ? STATIC_T : time, par.x, par.y);
      }
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    });
    io.observe(root);

    const ro = new ResizeObserver(resize);
    ro.observe(root);

    const ok = setup();
    if (ok) {
      resize();
      if (reduced) {
        draw(STATIC_T, 0, 0);
      } else {
        draw(time, 0, 0);
        root.addEventListener("pointermove", onPointerMove);
        root.addEventListener("pointerleave", onPointerLeave);
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
    // colorKey covers `colors` and `background`; speed/paused apply via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorKey, pixelSize, grain, reduced]);

  return (
    <div
      ref={rootRef}
      className={cn("relative overflow-hidden", className)}
      style={{ background, ...style }}
      {...props}
    >
      {/* Keyed so prop changes remount the canvas with a fresh GL context. */}
      <canvas
        key={`${colorKey}|${pixelSize}|${grain}|${reduced}`}
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default DitherAurora;
