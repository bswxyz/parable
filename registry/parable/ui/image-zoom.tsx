"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";

/** Round a float to 3 decimals — full-precision floats trip React hydration. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Clamp `n` into the inclusive `[lo, hi]` range. */
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/** Elements that can hold keyboard focus — for the lightbox Tab trap. */
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface ImageZoomProps {
  /** Image source. Used for both the inline frame and the lightbox. */
  src: string;
  /** Alt text (required). Also names the lightbox dialog for assistive tech. */
  alt: string;
  /** Inner-zoom magnification while hovering/pressing the frame. Default `2`. */
  zoom?: number;
  /** Whether clicking the frame opens the full-screen lightbox. Default `true`. */
  lightbox?: boolean;
  /** Intrinsic pixel width — set with `height` to reserve space (no CLS). */
  width?: number;
  /** Intrinsic pixel height — set with `width` to reserve space (no CLS). */
  height?: number;
  /** Extra classes on the frame element. */
  className?: string;
}

/**
 * ImageZoom — a hover/press inner-magnifier plus a click-to-open lightbox, with
 * no external lens box. Hovering (or pressing on touch) fades in a duplicate of
 * the image scaled by `zoom`; its `transform-origin` tracks the pointer through
 * one rAF-coalesced write, so the pixels under the cursor stay put and magnify
 * in place. Clicking the frame springs open a full-screen lightbox rendered
 * through `createPortal` to `document.body`: a blurred backdrop, the image
 * centered and `object-contain`, Escape or a backdrop click to dismiss, body
 * scroll locked, Tab trapped inside, and focus returned to the trigger on close.
 *
 * The frame is a real `<img>` (pass `width`/`height` to reserve its box), the
 * magnifier layer is `aria-hidden`, and the trigger is a proper `<button>` so it
 * is keyboard operable with a `:focus-visible` ring. Under
 * `prefers-reduced-motion` the zoom-follow is dropped entirely (the still image
 * stays fully legible) and the lightbox opens instantly with no scale or fade.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (focus ring violet
 * `#8b5cf6`, backdrop ink `#0f0f10`).
 *
 * @parable/image-zoom
 */
export function ImageZoom({
  src,
  alt,
  zoom = 2,
  lightbox = true,
  width,
  height,
  className,
}: ImageZoomProps) {
  const reduce = useReducedMotion();
  const magnify = !reduce;

  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  const rootRef = React.useRef<HTMLElement | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const zoomRef = React.useRef<HTMLImageElement | null>(null);
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const closeRef = React.useRef<HTMLButtonElement | null>(null);
  const prevFocusRef = React.useRef<HTMLElement | null>(null);

  const origin = React.useRef({ x: 0.5, y: 0.5 });
  const raf = React.useRef(0);

  React.useEffect(() => setMounted(true), []);

  // Cancel any pending origin write when the component unmounts.
  React.useEffect(() => {
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const openLightbox = React.useCallback(() => {
    if (lightbox) setOpen(true);
  }, [lightbox]);
  const close = React.useCallback(() => setOpen(false), []);

  // Follow the pointer: store the latest position, then flush the
  // transform-origin once per frame so a burst of pointermoves never thrashes.
  const onPointerMove = React.useCallback((e: React.PointerEvent) => {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    origin.current.x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    origin.current.y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const z = zoomRef.current;
      if (z) {
        z.style.transformOrigin = `${r3(origin.current.x * 100)}% ${r3(
          origin.current.y * 100
        )}%`;
      }
    });
  }, []);

  // On open: remember focus, focus the close button, lock scroll; restore both
  // on close.
  React.useEffect(() => {
    if (!open || typeof document === "undefined") return;
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    const id = requestAnimationFrame(() => closeRef.current?.focus());
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = prevOverflow;
      (prevFocusRef.current ?? rootRef.current)?.focus?.();
    };
  }, [open]);

  const trapTab = React.useCallback((e: React.KeyboardEvent) => {
    const root = dialogRef.current;
    if (!root) return;
    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>(FOCUSABLE)
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !root.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last || !root.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  const onDialogKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      trapTab(e);
    }
  };

  const overlayT: Transition = reduce
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.22, 1, 0.36, 1] };
  const panelT: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 220, damping: 24, mass: 0.9 };

  const lightboxNode =
    mounted && lightbox
      ? createPortal(
          <AnimatePresence>
            {open && (
              <div
                className="fixed inset-0 flex items-center justify-center p-4 sm:p-8"
                style={{ zIndex: 2147483646 }}
              >
                <motion.div
                  aria-hidden
                  onClick={close}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={overlayT}
                  className="absolute inset-0 cursor-zoom-out bg-black/80 backdrop-blur-md"
                />

                <motion.div
                  ref={dialogRef}
                  role="dialog"
                  aria-modal="true"
                  aria-label={alt}
                  onKeyDown={onDialogKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                  transition={panelT}
                  className="relative flex max-h-full max-w-full flex-col items-center"
                >
                  <img
                    src={src}
                    alt={alt}
                    draggable={false}
                    className="block h-auto max-h-[86vh] w-auto max-w-[92vw] select-none rounded-lg object-contain shadow-[0_28px_80px_-24px_rgba(0,0,0,0.9)]"
                  />

                  <button
                    ref={closeRef}
                    type="button"
                    onClick={close}
                    aria-label="Close image viewer"
                    className={cn(
                      "absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center",
                      "rounded-full border border-white/15 bg-black/55 text-white/90 backdrop-blur-sm",
                      "transition-colors hover:bg-black/75 hover:text-white",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    )}
                  >
                    <X aria-hidden size={18} strokeWidth={2.25} />
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )
      : null;

  const frame = (
    <>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        draggable={false}
        className="block h-auto w-full max-w-full select-none"
      />

      {mounted && magnify && (
        <img
          ref={zoomRef}
          src={src}
          alt=""
          aria-hidden
          draggable={false}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "50% 50%",
            willChange: "transform",
          }}
          className={cn(
            "pointer-events-none absolute inset-0 h-full w-full select-none object-cover",
            "opacity-0 transition-opacity duration-200 ease-out",
            "group-hover:opacity-100 group-active:opacity-100"
          )}
        />
      )}

      {lightbox && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute right-2 top-2 z-10 inline-flex items-center gap-1",
            "rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm",
            "opacity-0 transition-opacity duration-200",
            "group-hover:opacity-100 group-focus-visible:opacity-100",
            "motion-reduce:opacity-100 motion-reduce:transition-none"
          )}
        >
          <ZoomIn size={13} strokeWidth={2.25} />
          Expand
        </span>
      )}
    </>
  );

  const frameClass = cn(
    "group relative inline-block max-w-full select-none overflow-hidden rounded-xl align-middle",
    "ring-1 ring-white/10",
    className
  );

  return (
    <>
      {lightbox ? (
        <button
          ref={(el) => {
            rootRef.current = el;
          }}
          type="button"
          onClick={openLightbox}
          onPointerMove={magnify ? onPointerMove : undefined}
          aria-haspopup="dialog"
          aria-label={`${alt} — open full size`}
          className={cn(
            frameClass,
            "cursor-zoom-in appearance-none border-0 bg-transparent p-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f10]"
          )}
        >
          {frame}
        </button>
      ) : (
        <div
          ref={(el) => {
            rootRef.current = el;
          }}
          onPointerMove={magnify ? onPointerMove : undefined}
          className={frameClass}
        >
          {frame}
        </div>
      )}

      {lightboxNode}
    </>
  );
}

export default ImageZoom;
