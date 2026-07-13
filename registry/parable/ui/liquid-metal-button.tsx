"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function useInjectedKeyframes(id: string, css: string) {
  React.useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/** Metal presets shipped with the ring. */
export type LiquidMetalPreset = "chromatic" | "silver" | "gold";

export interface LiquidMetalButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Metal look for the ring. `"chromatic"` hue-rotates iridescent reflections. */
  preset?: LiquidMetalPreset;
  /** Reflection intensity / turbulence, 0–1. Hover nudges it up. Default `0.6`. */
  strength?: number;
  /** Freeze the shader on a single rendered frame. */
  paused?: boolean;
  /** Visual thickness of the metal ring. Default `"2.5px"`. */
  ringWidth?: string;
  /** Corner radius of the pill. Default `"9999px"`. */
  radius?: string;
  /** Solid colour of the inner button face (mirrors `--pb-ink`). Default `#0f0f10`. */
  background?: string;
  /**
   * Render as a different element for navigation semantics — e.g. an `<a>` or a
   * router `Link`. Defaults to `"button"`. Pass `href` alongside for links.
   */
  as?: React.ElementType;
  /** Destination, used when rendering as a link element via `as`. */
  href?: string;
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uStrength;
uniform float uPreset;  // 0 chromatic, 1 silver, 2 gold
uniform vec2  uRes;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p){
  float v = 0.0, amp = 0.5;
  for(int i = 0; i < 4; i++){ v += amp * noise(p); p *= 2.0; amp *= 0.5; }
  return v;
}

vec3 hsv2rgb(vec3 c){
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z * mix(vec3(1.0), rgb, c.y);
}

void main(){
  vec2 p = vUv - 0.5;
  p.x *= uRes.x / max(uRes.y, 1.0);

  float ang = atan(p.y, p.x);
  float t   = uTime;
  float turb = mix(0.15, 1.2, clamp(uStrength, 0.0, 1.2));

  // slow flowing distortion so the metal never sits still
  float flow = fbm(p * 3.0 + vec2(t * 0.06, -t * 0.045));

  // banded environment reflections wrapping around the ring
  float bands = sin(ang * 6.0 + vUv.x * 3.0 + flow * turb * 6.2831 + t * 0.9);
  float m = 0.5 + 0.5 * bands;

  // sharp specular streaks + fresnel-ish edge boost
  float spec = pow(max(bands, 0.0), 6.0);
  float fres = pow(1.0 - abs(bands), 3.0);

  // faint top-lit chrome horizon
  float horizon = smoothstep(0.0, 1.0, vUv.y);
  m = mix(m, m * 0.6 + 0.4 * (1.0 - horizon), 0.35);

  vec3 col;
  if(uPreset < 0.5){
    float hue = fract(m * 0.5 + t * 0.03 + ang / 6.2831 + flow * 0.2);
    col = hsv2rgb(vec3(hue, 0.55, 0.55 + 0.4 * m));
    col += spec * vec3(1.0);
  } else if(uPreset < 1.5){
    col = mix(vec3(0.08, 0.10, 0.14), vec3(0.92, 0.95, 1.0), m);
    col += spec * vec3(0.90, 0.95, 1.0);
  } else {
    col = mix(vec3(0.12, 0.07, 0.02), vec3(1.0, 0.84, 0.42), m);
    col += spec * vec3(1.0, 0.93, 0.70);
  }

  col += fres * 0.15 * clamp(uStrength, 0.0, 1.2);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  src: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

const PRESET_INDEX: Record<LiquidMetalPreset, number> = {
  chromatic: 0,
  silver: 1,
  gold: 2,
};

/** CSS gradient shown when WebGL is unavailable (and as the reduced-motion base). */
const FALLBACK_RING: Record<LiquidMetalPreset, string> = {
  chromatic:
    "conic-gradient(from 0deg,#8b5cf6,#ec4899,#f5a623,#22d3ee,#8b5cf6)",
  silver:
    "conic-gradient(from 0deg,#5b6472,#e9edf5,#8b94a3,#f4f7fb,#5b6472)",
  gold: "conic-gradient(from 0deg,#6b4a12,#ffe6a1,#c8912f,#fff2cf,#6b4a12)",
};

/**
 * LiquidMetalButton — a pill button ringed by a live liquid-metal / chrome band
 * rendered in raw WebGL1 (no three.js): sin-warped environment bands, animated
 * noise distortion, and a fresnel-ish edge boost. `"chromatic"` hue-rotates the
 * reflections, `"silver"` is cool steel, `"gold"` is warm. Hover eases the
 * turbulence up via a JS-lerped uniform (spring-smoothed). The canvas is
 * decorative and clipped to a thin border; the `:focus-visible` ring sits
 * outside it. Colours default to the Parable palette (violet #8b5cf6, fuchsia
 * #ec4899, ember #f5a623, signal cyan #22d3ee, ink #0f0f10 — the site's --pb-*
 * tokens). Under `prefers-reduced-motion` it renders one static frame; if WebGL
 * is missing it degrades to a CSS conic-gradient ring.
 *
 * @parable/liquid-metal-button
 */
export const LiquidMetalButton = React.forwardRef<
  HTMLButtonElement,
  LiquidMetalButtonProps
>(function LiquidMetalButton(
  {
    preset = "chromatic",
    strength = 0.6,
    paused = false,
    ringWidth = "2.5px",
    radius = "9999px",
    background = "#0f0f10",
    as,
    className,
    style,
    children,
    onPointerEnter,
    onPointerLeave,
    ...props
  },
  ref
) {
  const Comp = (as ?? "button") as React.ElementType;
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Dynamic values read inside the rAF loop without re-initialising WebGL.
  const pausedRef = React.useRef(paused);
  const hoveredRef = React.useRef(false);
  React.useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Force a full re-init when the GL context is restored.
  const [ctxGen, setCtxGen] = React.useState(0);

  useInjectedKeyframes(
    "pb-liquid-metal-button-kf",
    "@keyframes pb-liquid-metal-spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.pb-liquid-metal-fallback{animation:none!important}}"
  );

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: "low-power",
    });
    if (!gl) return; // CSS fallback ring stays visible.

    const program = createProgram(gl);
    if (!program) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "uTime");
    const uStrength = gl.getUniformLocation(program, "uStrength");
    const uPreset = gl.getUniformLocation(program, "uPreset");
    const uRes = gl.getUniformLocation(program, "uRes");

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const presetIdx = PRESET_INDEX[preset];
    let cur = strength;

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const draw = (seconds: number) => {
      gl.uniform1f(uTime, seconds);
      gl.uniform1f(uStrength, cur);
      gl.uniform1f(uPreset, presetIdx);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    resize();

    let raf = 0;
    let visible = true;

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            resize();
            if (reduced) draw(0);
          })
        : null;
    ro?.observe(canvas);

    const io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              visible = entries[0]?.isIntersecting ?? true;
            },
            { threshold: 0 }
          )
        : null;
    io?.observe(canvas);

    if (reduced) {
      draw(0); // one static frame, no loop
    } else {
      let last = performance.now();
      let elapsed = 0;
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        const dt = now - last;
        last = now;
        if (!visible || pausedRef.current) return; // freeze cleanly
        elapsed += dt;
        const target = hoveredRef.current
          ? Math.min(strength + 0.3, 1.15)
          : strength;
        cur += (target - cur) * 0.08; // spring-smoothed lerp
        draw(elapsed / 1000);
      };
      raf = requestAnimationFrame(frame);
    }

    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
    };
    const onRestored = () => setCtxGen((g) => g + 1);
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      io?.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [preset, strength, reduced, ctxGen]);

  const vars = {
    "--pb-lm-ring": ringWidth,
    "--pb-lm-radius": radius,
    "--pb-lm-face": background,
    "--pb-lm-fallback": FALLBACK_RING[preset],
  } as React.CSSProperties;

  const handlePointerEnter = (e: React.PointerEvent<HTMLButtonElement>) => {
    hoveredRef.current = true;
    onPointerEnter?.(e);
  };
  const handlePointerLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
    hoveredRef.current = false;
    onPointerLeave?.(e);
  };

  return (
    <Comp
      ref={ref}
      style={{ ...vars, ...style }}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "group relative isolate inline-flex cursor-pointer select-none items-center justify-center gap-2 overflow-hidden whitespace-nowrap",
        "px-6 py-3 text-sm font-medium text-white outline-none",
        "[border-radius:var(--pb-lm-radius)]",
        "transition-transform duration-200 active:translate-y-px",
        "focus-visible:ring-2 focus-visible:ring-[#8b5cf6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f10]",
        "disabled:pointer-events-none disabled:opacity-60",
        className
      )}
      {...props}
    >
      {/* animated CSS fallback ring (also the reduced-motion / no-WebGL base) */}
      <span
        aria-hidden
        className="pb-liquid-metal-fallback pointer-events-none absolute inset-[-40%] -z-10 animate-[pb-liquid-metal-spin_9s_linear_infinite] [background:var(--pb-lm-fallback)]"
      />

      {/* live liquid-metal ring */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full [border-radius:var(--pb-lm-radius)]"
      />

      {/* inner face mask — leaves only the ring exposed */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute z-0 [inset:var(--pb-lm-ring)] [border-radius:var(--pb-lm-radius)]",
          "[background:var(--pb-lm-face)]",
          "shadow-[inset_0_1px_0_#ffffff1a,inset_0_-10px_16px_#0000006b]",
          "transition-shadow duration-300",
          "group-hover:shadow-[inset_0_1px_0_#ffffff33,inset_0_-8px_16px_#00000059]"
        )}
      />

      {/* label */}
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
    </Comp>
  );
});

export default LiquidMetalButton;
