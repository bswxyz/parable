"use client";

/**
 * A tiny once-per-session balloon burst — the success-moment delight
 * (metal-fx / balloons-js spirit, our own implementation). Respects
 * prefers-reduced-motion and never runs on the server.
 */
let firedThisSession = false;

const COLORS = ["#c4b5fd", "#f5a623", "#29e6ff", "#ff6ea9", "#8bffb0"];

export function releaseBalloons(force = false) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (firedThisSession && !force) return;
  firedThisSession = true;

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: "9999",
    overflow: "hidden",
  });
  document.body.appendChild(layer);

  const n = 14;
  for (let i = 0; i < n; i++) {
    const b = document.createElement("div");
    const size = 16 + Math.random() * 20;
    const left = Math.random() * 100;
    const dur = 2600 + Math.random() * 1800;
    const delay = Math.random() * 250;
    const color = COLORS[i % COLORS.length];
    Object.assign(b.style, {
      position: "absolute",
      left: `${left}vw`,
      bottom: `-${size * 2}px`,
      width: `${size}px`,
      height: `${size * 1.2}px`,
      borderRadius: "50%",
      background: `radial-gradient(circle at 35% 30%, #ffffffcc, ${color} 60%)`,
      boxShadow: `0 0 12px ${color}66`,
      transform: "translateY(0)",
      transition: `transform ${dur}ms cubic-bezier(.22,.61,.36,1) ${delay}ms, opacity ${dur}ms ease-in ${delay}ms`,
      opacity: "1",
    });
    layer.appendChild(b);
    requestAnimationFrame(() => {
      b.style.transform = `translateY(-115vh) translateX(${
        (Math.random() - 0.5) * 80
      }px) rotate(${(Math.random() - 0.5) * 40}deg)`;
      b.style.opacity = "0.1";
    });
  }
  window.setTimeout(() => layer.remove(), 5200);
}
