"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Lock, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DeviceFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Which mockup to render around the children. */
  variant?: "phone" | "browser";
  /** Address-bar text for the `"browser"` variant. */
  url?: string;
  /**
   * Optional tab label for the `"browser"` variant. When provided, a tab strip
   * is rendered above the toolbar; omit it for a chromeless single-row window.
   */
  tab?: string;
  /** Layered, realistic drop shadow under the frame. */
  shadow?: boolean;
  /** Screen content — clipped to the device's screen area. */
  children?: React.ReactNode;
}

/**
 * DeviceFrame — a pure-CSS device mockup that clips its children into a screen.
 *
 * `"browser"` renders macOS-style traffic-light dots, an optional tab strip, and
 * an address bar showing the `url` prop; `"phone"` renders a rounded titanium
 * slab with a dynamic-island notch, machined side buttons, and a subtle screen
 * inner shadow. Hairline edges use rgba so the frame stays crisp in both light
 * and dark themes, and the phone scales proportionally at any width via
 * container-query units — no fixed breakpoints. There is no animation, so the
 * component is inherently static and satisfies `prefers-reduced-motion` with a
 * legible, motion-free render.
 *
 * The chrome is intentionally achromatic (mirroring the site's flat-UI design
 * language, where chroma lives only inside rendered content); traffic-light hues
 * are the standard system red/amber/green. The `--pb-*` brand palette
 * (violet #8b5cf6, fuchsia #ec4899, ember #f5a623, signal #22d3ee, ink #0f0f10)
 * is left to whatever you place on the screen.
 *
 * @parable/device-frame
 */
export function DeviceFrame({
  variant = "browser",
  url = "parable-three.vercel.app",
  tab,
  shadow = true,
  className,
  children,
  style,
  ...props
}: DeviceFrameProps) {
  if (variant === "phone") {
    return (
      <PhoneFrame
        shadow={shadow}
        className={className}
        style={style}
        {...props}
      >
        {children}
      </PhoneFrame>
    );
  }

  return (
    <BrowserFrame
      url={url}
      tab={tab}
      shadow={shadow}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </BrowserFrame>
  );
}

/* ── browser ──────────────────────────────────────────────────────────── */

const BROWSER_DROP =
  "0 1px 2px rgba(0,0,0,0.08), 0 12px 28px -10px rgba(0,0,0,0.28), 0 34px 64px -28px rgba(0,0,0,0.34)";

function BrowserFrame({
  url,
  tab,
  shadow,
  className,
  style,
  children,
  ...props
}: {
  url: string;
  tab?: string;
  shadow: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-variant="browser"
      className={cn(
        "relative overflow-hidden rounded-xl",
        "border border-black/10 dark:border-white/12",
        "bg-neutral-100 text-neutral-800 dark:bg-neutral-900 dark:text-neutral-100",
        className
      )}
      style={{ boxShadow: shadow ? BROWSER_DROP : undefined, ...style }}
      {...props}
    >
      {/* chrome */}
      <div aria-hidden className="select-none">
        {tab ? (
          <>
            <div className="flex items-end gap-3 px-3.5 pt-3">
              <TrafficLights />
              <div className="flex min-w-0 items-center gap-1.5 rounded-t-lg border border-b-0 border-black/[0.06] bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 dark:border-white/[0.06] dark:bg-neutral-950 dark:text-neutral-200">
                <span className="size-2 shrink-0 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                <span className="truncate">{tab}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 border-t border-black/[0.05] px-3.5 py-2 dark:border-white/[0.06]">
              <NavIcons />
              <UrlBar url={url} />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 px-3.5 py-2.5">
            <TrafficLights />
            <UrlBar url={url} />
          </div>
        )}
      </div>

      {/* screen */}
      <div className="relative overflow-hidden border-t border-black/[0.06] bg-white [aspect-ratio:16/10] dark:border-white/[0.06] dark:bg-neutral-950">
        <div className="absolute inset-0">{children}</div>
        {/* subtle top inner shadow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/[0.04] to-transparent dark:from-black/20"
        />
      </div>
    </div>
  );
}

function TrafficLights() {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
        <span
          key={c}
          className="size-3 rounded-full ring-1 ring-inset ring-black/15 dark:ring-black/25"
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

function NavIcons() {
  return (
    <div className="flex shrink-0 items-center gap-1 text-neutral-400 dark:text-neutral-500">
      <ChevronLeft className="size-4" strokeWidth={2.25} />
      <ChevronRight className="size-4 opacity-50" strokeWidth={2.25} />
      <RotateCw className="ml-0.5 size-3.5" strokeWidth={2.25} />
    </div>
  );
}

function UrlBar({ url }: { url: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-black/[0.06] bg-white px-2.5 py-1 text-xs text-neutral-500 dark:border-white/[0.06] dark:bg-white/[0.04] dark:text-neutral-400">
      <Lock className="size-3 shrink-0 text-neutral-400 dark:text-neutral-500" strokeWidth={2.25} />
      <span className="truncate">{url}</span>
    </div>
  );
}

/* ── phone ────────────────────────────────────────────────────────────── */

const PHONE_METAL =
  "linear-gradient(145deg,#4c4c52 0%,#232326 26%,#161619 55%,#2b2b30 82%,#3c3c42 100%)";
const PHONE_RIM =
  "inset 0 1px 0 rgba(255,255,255,0.16), inset 0 0 0 1px rgba(0,0,0,0.55), inset 0 -1px 3px rgba(0,0,0,0.6)";
const PHONE_DROP =
  "0 2px 5px rgba(0,0,0,0.14), 0 16px 32px -10px rgba(0,0,0,0.4), 0 48px 70px -30px rgba(0,0,0,0.5)";
const BTN_METAL = "linear-gradient(90deg,#101013,#33333a 55%,#101013)";

function PhoneFrame({
  shadow,
  className,
  style,
  children,
  ...props
}: {
  shadow: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-variant="phone"
      className={cn("relative [container-type:inline-size]", className)}
      style={style}
      {...props}
    >
      {/* side buttons (decorative) */}
      <span
        aria-hidden
        className="absolute left-[-0.9cqw] top-[22cqw] z-0 h-[5cqw] w-[1cqw] rounded-l-[1cqw]"
        style={{ background: BTN_METAL }}
      />
      <span
        aria-hidden
        className="absolute left-[-0.9cqw] top-[30cqw] z-0 h-[9cqw] w-[1cqw] rounded-l-[1cqw]"
        style={{ background: BTN_METAL }}
      />
      <span
        aria-hidden
        className="absolute left-[-0.9cqw] top-[41cqw] z-0 h-[9cqw] w-[1cqw] rounded-l-[1cqw]"
        style={{ background: BTN_METAL }}
      />
      <span
        aria-hidden
        className="absolute right-[-0.9cqw] top-[33cqw] z-0 h-[13cqw] w-[1cqw] rounded-r-[1cqw]"
        style={{ background: BTN_METAL }}
      />

      {/* body */}
      <div
        className="relative z-10 rounded-[14cqw] p-[2.8cqw]"
        style={{
          background: PHONE_METAL,
          boxShadow: shadow ? `${PHONE_RIM}, ${PHONE_DROP}` : PHONE_RIM,
        }}
      >
        {/* screen */}
        <div className="relative overflow-hidden rounded-[10.6cqw] bg-neutral-100 [aspect-ratio:9/19.5] dark:bg-neutral-900">
          <div className="absolute inset-0 z-10">{children}</div>

          {/* screen inner shadow (over content) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.5),inset_0_2px_10px_rgba(0,0,0,0.35)]"
          />

          {/* dynamic island */}
          <div
            aria-hidden
            className="absolute left-1/2 top-[2.4cqw] z-30 flex h-[7cqw] w-[27cqw] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-[1.6cqw]"
          >
            <span className="size-[2.6cqw] rounded-full bg-[#0a0a12] shadow-[inset_0_0_0_1px_rgba(120,150,255,0.14)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeviceFrame;
