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

/** Deterministic PRNG — same seed, same layout, every visit. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Resolves `var(--token, fallback)` strings against a live element so canvas
 * (which cannot parse `var()`) gets a concrete colour. Plain colours pass
 * through untouched.
 */
function resolveColor(el: HTMLElement, color: string): string {
  const m = color.trim().match(/^var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)$/);
  if (!m) return color;
  const resolved = getComputedStyle(el).getPropertyValue(m[1]).trim();
  return resolved || (m[2] ? m[2].trim() : "#888888");
}

const MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace';

const DEFAULT_GROUP_PALETTE = [
  "#8b5cf6",
  "#ec4899",
  "#22d3ee",
  "#f59e0b",
  "#10b981",
  "#f43f5e",
];

const FORCE_GRAPH_CSS = `
.pb-forcegraph{position:relative;overflow:hidden;}
.pb-forcegraph-canvas{display:block;width:100%;height:100%;outline:none;border-radius:inherit;}
.pb-forcegraph-canvas:focus-visible{outline:2px solid var(--ring,#8b5cf6);outline-offset:2px;}
.pb-forcegraph-pulse{position:absolute;top:0;left:0;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:9999px;border:1.5px solid currentColor;opacity:0;visibility:hidden;pointer-events:none;will-change:transform,opacity;animation:pb-forcegraph-pulse 2.2s cubic-bezier(.2,.6,.35,1) infinite;}
.pb-forcegraph-paused .pb-forcegraph-pulse{animation-play-state:paused;}
@keyframes pb-forcegraph-pulse{0%{transform:scale(.55);opacity:.75}75%,100%{transform:scale(2.7);opacity:0}}
@media (prefers-reduced-motion:reduce){.pb-forcegraph-pulse{animation:none!important;transform:scale(1.6);opacity:.4;}}
`;

export interface ForceGraphNode {
  /** Unique id, referenced by links. */
  id: string;
  /** Display label. Falls back to `id` in the screen-reader list and canvas. */
  label?: string;
  /** Group key used for colour mapping. */
  group?: string;
  /** Emphasised node: slightly larger dot plus an optional pulse ring. */
  emphasis?: boolean;
}

export interface ForceGraphLink {
  /** `id` of the source node. */
  source: string;
  /** `id` of the target node. */
  target: string;
}

export interface ForceGraphProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Graph nodes. Prefer a stable (memoised) array. */
  nodes: ForceGraphNode[];
  /** Graph links, referencing node ids. Unknown ids are ignored. */
  links: ForceGraphLink[];
  /**
   * Explicit colour per group key, e.g. `{ core: "#8b5cf6" }`. Accepts any CSS
   * colour or a `var(--token, fallback)` expression.
   */
  groupColors?: Record<string, string>;
  /**
   * Fallback palette cycled through groups (in first-appearance order) that
   * have no `groupColors` entry.
   */
  groupPalette?: string[];
  /** Colour for ungrouped nodes. Defaults to the theme `--primary` token. */
  nodeColor?: string;
  /** Edge colour. Defaults to the theme `--muted-foreground` token. */
  linkColor?: string;
  /** Label colour. Defaults to the theme `--muted-foreground` token. */
  labelColor?: string;
  /** Show a pulsing ring on `emphasis` nodes (static ring under reduced motion). */
  pulse?: boolean;
  /** Base node radius in px (grows slightly with degree and emphasis). */
  nodeRadius?: number;
  /** Link rest length in px. Defaults to ~22% of the shorter canvas edge. */
  linkDistance?: number;
  /** Canvas height. Width always fills the container. */
  height?: number | string;
  /** Layout seed — change it to get a different deterministic arrangement. */
  seed?: number;
  /** Class applied to the canvas element itself. */
  canvasClassName?: string;
}

/**
 * ForceGraph — a canvas force-directed graph (repulsion + link springs + soft
 * centring) that cools via alpha decay and *stops ticking once settled* — no
 * perpetual rAF. Hovering (or keyboard-focusing) a node lights up its
 * neighbourhood and dims the rest; `emphasis` nodes carry a CSS-driven pulse
 * ring that keeps breathing after the physics sleep. Colours resolve from
 * Parable theme tokens by default and re-resolve when the theme flips.
 *
 * Accessible: the canvas is focusable with `role="img"` and a count summary;
 * Arrow keys cycle nodes (Home/End jump, Escape clears), a polite live region
 * announces the focused node, and a visually-hidden list exposes every label.
 * Under `prefers-reduced-motion` the simulation settles synchronously and
 * renders a static frame — hover and keyboard highlighting still work.
 *
 * Pauses off-screen (IntersectionObserver) and on hidden tabs; DPR capped at
 * 1.5; initial layout is seeded, never random, so renders are deterministic.
 *
 * @parable/force-graph
 */
export const ForceGraph = React.forwardRef<HTMLDivElement, ForceGraphProps>(
  function ForceGraph(
    {
      nodes,
      links,
      groupColors,
      groupPalette = DEFAULT_GROUP_PALETTE,
      nodeColor = "var(--primary, #8b5cf6)",
      linkColor = "var(--muted-foreground, #9ca3af)",
      labelColor = "var(--muted-foreground, #9ca3af)",
      pulse = true,
      nodeRadius = 5,
      linkDistance,
      height = 360,
      seed = 42,
      canvasClassName,
      className,
      style,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) {
    useInjectedKeyframes("pb-forcegraph-css", FORCE_GRAPH_CSS);
    const reduced = usePrefersReducedMotion();

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
    const [announce, setAnnounce] = React.useState("");

    const setContainerRef = React.useCallback(
      (el: HTMLDivElement | null) => {
        containerRef.current = el;
        if (typeof ref === "function") ref(el);
        else if (ref) ref.current = el;
      },
      [ref]
    );

    // Identity-stable access to array/object props: the effect keys off the
    // serialised content, so inline literals don't restart the simulation on
    // every parent render.
    const propsRef = React.useRef({ nodes, links, groupColors, groupPalette });
    propsRef.current = { nodes, links, groupColors, groupPalette };
    const dataKey = JSON.stringify([nodes, links, groupColors, groupPalette]);

    React.useEffect(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const {
        nodes: specs,
        links: linkSpecs,
        groupColors: gColors,
        groupPalette: gPalette,
      } = propsRef.current;

      /* ---- graph structure ---- */
      const idToIndex = new Map<string, number>();
      specs.forEach((s, i) => idToIndex.set(s.id, i));
      const edges: [number, number][] = [];
      for (const l of linkSpecs) {
        const a = idToIndex.get(l.source);
        const b = idToIndex.get(l.target);
        if (a !== undefined && b !== undefined && a !== b) edges.push([a, b]);
      }
      const neighbours: Set<number>[] = specs.map(() => new Set());
      for (const [a, b] of edges) {
        neighbours[a].add(b);
        neighbours[b].add(a);
      }

      let W = container.clientWidth || 560;
      let H = container.clientHeight || 360;

      /* ---- seeded initial layout (deterministic, consumed in index order) ---- */
      const rand = mulberry32((seed >>> 0) || 1);
      const sim = specs.map((s, i) => {
        const angle = rand() * Math.PI * 2 + i * 0.7;
        const spread = 0.16 + rand() * 0.3;
        return {
          x: W / 2 + Math.cos(angle) * spread * W,
          y: H / 2 + Math.sin(angle) * spread * H,
          vx: 0,
          vy: 0,
          r:
            nodeRadius +
            (s.emphasis ? 1.5 : 0) +
            Math.min(neighbours[i].size, 6) * 0.35,
        };
      });

      /* ---- theme-aware palette, re-read when the theme flips ---- */
      const groupOrder: string[] = [];
      for (const s of specs)
        if (s.group && !groupOrder.includes(s.group)) groupOrder.push(s.group);

      let pal = {
        base: "#8b5cf6",
        link: "#9ca3af",
        label: "#9ca3af",
        active: "#e5e5e5",
        groups: new Map<string, string>(),
      };
      const readPalette = () => {
        const groups = new Map<string, string>();
        groupOrder.forEach((g, gi) => {
          const raw =
            (gColors && gColors[g]) || gPalette[gi % gPalette.length] || nodeColor;
          groups.set(g, resolveColor(container, raw));
        });
        pal = {
          base: resolveColor(container, nodeColor),
          link: resolveColor(container, linkColor),
          label: resolveColor(container, labelColor),
          active: resolveColor(container, "var(--foreground, #e5e5e5)"),
          groups,
        };
      };
      const colorOf = (i: number) => {
        const g = specs[i].group;
        return (g && pal.groups.get(g)) || pal.base;
      };

      /* ---- pulse overlay elements (CSS animates; JS only positions) ---- */
      const pulseEls = new Map<string, HTMLElement>();
      container
        .querySelectorAll<HTMLElement>("[data-pb-forcegraph-pulse]")
        .forEach((el) =>
          pulseEls.set(el.getAttribute("data-pb-forcegraph-pulse") || "", el)
        );

      /* ---- interaction state ---- */
      let hoverIdx = -1;
      let focusIdx = -1;

      /* ---- physics: repulsion + link springs + soft centring, alpha decay ---- */
      let alpha = 1;
      const ALPHA_MIN = 0.02;
      const DECAY = 0.985;
      let settled = false;

      const step = () => {
        const rep = W * H * 0.0075 * alpha;
        for (let i = 0; i < sim.length; i++) {
          for (let j = i + 1; j < sim.length; j++) {
            const a = sim[i];
            const b = sim[j];
            let dx = a.x - b.x;
            let dy = a.y - b.y;
            let d2 = dx * dx + dy * dy;
            if (d2 < 1) {
              dx = 0.5;
              dy = 0.5;
              d2 = 0.5;
            }
            const d = Math.sqrt(d2);
            const f = rep / d2;
            const fx = (dx / d) * f;
            const fy = (dy / d) * f;
            a.vx += fx;
            a.vy += fy;
            b.vx -= fx;
            b.vy -= fy;
          }
        }
        const rest = linkDistance ?? Math.min(W, H) * 0.22;
        for (const [i, j] of edges) {
          const a = sim[i];
          const b = sim[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.max(1, Math.hypot(dx, dy));
          const f = (d - rest) * 0.02 * alpha;
          const fx = (dx / d) * f;
          const fy = (dy / d) * f;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
        const pad = nodeRadius + 18;
        for (const n of sim) {
          n.vx += (W / 2 - n.x) * 0.003 * alpha;
          n.vy += (H / 2 - n.y) * 0.003 * alpha;
          n.vx *= 0.85;
          n.vy *= 0.85;
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < pad) {
            n.x = pad;
            n.vx *= -0.4;
          }
          if (n.x > W - pad) {
            n.x = W - pad;
            n.vx *= -0.4;
          }
          if (n.y < pad) {
            n.y = pad;
            n.vy *= -0.4;
          }
          if (n.y > H - pad) {
            n.y = H - pad;
            n.vy *= -0.4;
          }
        }
        alpha *= DECAY;
        if (alpha < ALPHA_MIN) settled = true;
      };

      /* ---- draw one frame (also event-driven once settled) ---- */
      const draw = () => {
        ctx.clearRect(0, 0, W, H);
        const active = focusIdx >= 0 ? focusIdx : hoverIdx;
        const hood = active >= 0 ? neighbours[active] : null;

        ctx.lineWidth = 1;
        for (const [i, j] of edges) {
          const lit = active >= 0 && (i === active || j === active);
          ctx.strokeStyle = lit ? colorOf(active) : pal.link;
          ctx.globalAlpha = lit ? 0.9 : active >= 0 ? 0.12 : 0.3;
          ctx.beginPath();
          ctx.moveTo(sim[i].x, sim[i].y);
          ctx.lineTo(sim[j].x, sim[j].y);
          ctx.stroke();
        }

        for (let i = 0; i < sim.length; i++) {
          const n = sim[i];
          const inHood =
            active < 0 || i === active || (hood !== null && hood.has(i));
          ctx.globalAlpha = inHood ? 1 : 0.22;
          ctx.beginPath();
          ctx.arc(n.x, n.y, i === active ? n.r + 1.5 : n.r, 0, Math.PI * 2);
          ctx.fillStyle = colorOf(i);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.font = `10px ${MONO}`;
        ctx.textBaseline = "middle";
        for (let i = 0; i < specs.length; i++) {
          const s = specs[i];
          const inHood = i === active || (hood !== null && hood.has(i));
          if (!s.emphasis && !inHood) continue;
          ctx.globalAlpha = active >= 0 && !inHood ? 0.35 : 1;
          ctx.fillStyle = inHood ? pal.active : pal.label;
          ctx.fillText(s.label ?? s.id, sim[i].x + sim[i].r + 6, sim[i].y);
        }
        ctx.globalAlpha = 1;

        for (let i = 0; i < specs.length; i++) {
          if (!specs[i].emphasis) continue;
          const el = pulseEls.get(specs[i].id);
          if (!el) continue;
          el.style.left = `${sim[i].x}px`;
          el.style.top = `${sim[i].y}px`;
          el.style.color = colorOf(i);
          el.style.visibility = "visible";
        }
      };

      /* ---- sizing (DPR capped at 1.5) ---- */
      const sizeCanvas = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (!w || !h) return false;
        for (const n of sim) {
          n.x = (n.x / W) * w;
          n.y = (n.y / H) * h;
        }
        W = w;
        H = h;
        const d = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.max(1, Math.floor(w * d));
        canvas.height = Math.max(1, Math.floor(h * d));
        ctx.setTransform(d, 0, 0, d, 0, 0);
        return true;
      };

      /* ---- run/pause plumbing ---- */
      let raf = 0;
      let running = false;
      let inView = true;
      let last = 0;

      const loop = (t: number) => {
        if (!running) return;
        if (t - last >= 33) {
          last = t;
          step();
          draw();
          if (settled) {
            running = false;
            return; // physics are cool — the rAF chain ends here
          }
        }
        raf = requestAnimationFrame(loop);
      };

      const updateRunning = () => {
        const shouldRun = !reduced && !settled && inView && !document.hidden;
        if (shouldRun && !running) {
          running = true;
          raf = requestAnimationFrame(loop);
        } else if (!shouldRun && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
        container.classList.toggle(
          "pb-forcegraph-paused",
          !inView || document.hidden
        );
      };

      /* ---- pointer: nearest node within reach ---- */
      const pick = (px: number, py: number) => {
        let best = -1;
        let bestD = Infinity;
        for (let i = 0; i < sim.length; i++) {
          const dx = sim[i].x - px;
          const dy = sim[i].y - py;
          const d2 = dx * dx + dy * dy;
          const reach = Math.max(sim[i].r + 9, 14);
          if (d2 < reach * reach && d2 < bestD) {
            bestD = d2;
            best = i;
          }
        }
        return best;
      };
      const onPointerMove = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        const next = pick(e.clientX - rect.left, e.clientY - rect.top);
        if (next !== hoverIdx) {
          hoverIdx = next;
          canvas.style.cursor = next >= 0 ? "pointer" : "default";
          draw();
        }
      };
      const onPointerLeave = () => {
        if (hoverIdx !== -1) {
          hoverIdx = -1;
          canvas.style.cursor = "default";
          draw();
        }
      };

      /* ---- keyboard: arrows cycle, Home/End jump, Escape clears ---- */
      const setFocusIdx = (i: number) => {
        focusIdx = i;
        if (i >= 0) {
          const s = specs[i];
          const deg = neighbours[i].size;
          setAnnounce(
            `${s.label ?? s.id}${s.group ? `, ${s.group}` : ""}, ${deg} connection${deg === 1 ? "" : "s"}`
          );
        } else {
          setAnnounce("");
        }
        draw();
      };
      const onKeyDown = (e: KeyboardEvent) => {
        const n = specs.length;
        if (!n) return;
        switch (e.key) {
          case "ArrowRight":
          case "ArrowDown":
            e.preventDefault();
            setFocusIdx((focusIdx + 1) % n);
            break;
          case "ArrowLeft":
          case "ArrowUp":
            e.preventDefault();
            setFocusIdx(focusIdx <= 0 ? n - 1 : focusIdx - 1);
            break;
          case "Home":
            e.preventDefault();
            setFocusIdx(0);
            break;
          case "End":
            e.preventDefault();
            setFocusIdx(n - 1);
            break;
          case "Escape":
            if (focusIdx >= 0) {
              e.preventDefault();
              setFocusIdx(-1);
            }
            break;
        }
      };
      const onBlur = () => {
        if (focusIdx >= 0) setFocusIdx(-1);
      };

      /* ---- boot ---- */
      sizeCanvas();
      readPalette();

      if (reduced) {
        // Pre-settle synchronously, paint a single static frame — no rAF loop.
        for (let i = 0; i < 600 && !settled; i++) step();
        settled = true;
        draw();
      } else {
        draw();
        updateRunning();
      }

      /* ---- observers + listeners ---- */
      const ro = new ResizeObserver(() => {
        if (!sizeCanvas()) return;
        if (!reduced) {
          alpha = Math.max(alpha, 0.3); // reheat so the layout adapts
          if (settled) settled = false;
          updateRunning();
        }
        draw();
      });
      ro.observe(container);

      const io = new IntersectionObserver(
        (entries) => {
          inView = entries[0]?.isIntersecting ?? true;
          updateRunning();
        },
        { threshold: 0 }
      );
      io.observe(container);

      const onVisibility = () => updateRunning();
      document.addEventListener("visibilitychange", onVisibility);

      const mo = new MutationObserver(() => {
        readPalette();
        if (!running) draw();
      });
      mo.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "data-theme", "style"],
      });

      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerleave", onPointerLeave);
      canvas.addEventListener("keydown", onKeyDown);
      canvas.addEventListener("blur", onBlur);

      return () => {
        running = false;
        cancelAnimationFrame(raf);
        ro.disconnect();
        io.disconnect();
        mo.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerleave", onPointerLeave);
        canvas.removeEventListener("keydown", onKeyDown);
        canvas.removeEventListener("blur", onBlur);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      dataKey,
      reduced,
      seed,
      pulse,
      nodeRadius,
      linkDistance,
      nodeColor,
      linkColor,
      labelColor,
    ]);

    const emphasisNodes = pulse ? nodes.filter((n) => n.emphasis) : [];
    const defaultLabel = `Force-directed graph: ${nodes.length} nodes, ${links.length} links. Focus the graph and use arrow keys to explore nodes.`;

    return (
      <div
        ref={setContainerRef}
        className={cn("pb-forcegraph rounded-xl", className)}
        style={{ height, ...style }}
        {...props}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={ariaLabel ?? defaultLabel}
          tabIndex={0}
          className={cn("pb-forcegraph-canvas", canvasClassName)}
        />

        {emphasisNodes.map((n) => (
          <span
            key={n.id}
            aria-hidden
            data-pb-forcegraph-pulse={n.id}
            className="pb-forcegraph-pulse"
          />
        ))}

        <span role="status" aria-live="polite" className="sr-only">
          {announce}
        </span>

        <div className="sr-only">
          <ul>
            {nodes.map((n) => (
              <li key={n.id}>
                {n.label ?? n.id}
                {n.group ? ` (${n.group})` : ""}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
);

export default ForceGraph;
