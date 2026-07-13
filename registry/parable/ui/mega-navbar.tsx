"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inject a `<style>` block of keyframes exactly once per document, keyed by a
 * stable id so many instances share a single tag. Client-only; safe on SSR
 * because it runs from an effect after hydration.
 */
function useInjectedKeyframes(id: string, css: string): void {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

const KEYFRAMES = `
@keyframes pb-mega-navbar-kf-sheen {
  0% { transform: translateX(-160%) skewX(-12deg); opacity: 0; }
  22% { opacity: 0.55; }
  60%, 100% { transform: translateX(420%) skewX(-12deg); opacity: 0; }
}`;

/** A single link inside a mega-menu column. */
export interface MegaNavLink {
  /** Visible link text. */
  label: string;
  /** Optional one-line description shown under the label. */
  desc?: string;
  /** Optional leading icon (e.g. a `lucide-react` glyph). Decorative. */
  icon?: React.ReactNode;
  /** Navigation target; defaults to `"#"` when omitted. */
  href?: string;
}

/** One column of links inside a mega-menu panel. */
export interface MegaNavColumn {
  /** Column heading. */
  title: string;
  /** Links stacked under the heading. */
  links: MegaNavLink[];
}

/** A top-level navbar item — either a plain link or a mega-menu trigger. */
export interface MegaNavItem {
  /** Visible label in the bar. */
  label: string;
  /** Columns of links; when present the item opens a mega panel on hover/focus. */
  panel?: MegaNavColumn[];
  /** Navigation target for a plain link item (used when `panel` is absent). */
  href?: string;
}

export interface MegaNavbarProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "children"> {
  /** Brand mark shown at the leading edge — a logo node or text. */
  brand?: React.ReactNode;
  /** Top-level items. Items with a `panel` open a mega-menu; others are links. */
  items: MegaNavItem[];
  /** Accent for the gliding pill, focus rings and hover glow. Mirrors `--pb-violet`. */
  accent?: string;
  /** Bar surface colour, rendered translucent over a blur. Mirrors `--pb-ink`. */
  background?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * MegaNavbar — a sticky, translucent top bar with an Apple-style animated
 * mega-menu. Hovering or keyboard-focusing a top item springs open a rich
 * dropdown sheet (columns of links with icons + descriptions), and a shared
 * background pill glides between active items via a Motion layout animation.
 * The bar is blurred and semi-transparent; the sheet fades/slides down and its
 * contents crossfade when moving between items.
 *
 * Fully keyboard operable as a disclosure-navigation menu: Left/Right (and
 * Home/End) roam the top items, Enter or ArrowDown drills into the open sheet,
 * ArrowUp/Down move through its links, Tab is trapped within the open item's
 * links, and Escape closes and returns focus to the trigger. Triggers expose
 * `aria-expanded` / `aria-controls`; the sheet is a labelled region. Below the
 * `md` breakpoint the whole thing collapses to a hamburger disclosure with an
 * accordion — a pure-CSS switch, so first paint matches the server.
 *
 * Under `prefers-reduced-motion` the pill snaps instead of gliding, the sheet
 * opens/closes instantly, and the decorative sheen is suppressed. Colour
 * defaults mirror the site's `--pb-*` tokens (accent violet #8b5cf6 on ink
 * #0f0f10; fuchsia #ec4899 / ember #f5a623 / signal #22d3ee available for
 * per-item icons supplied via props).
 *
 * @parable/mega-navbar
 */
export function MegaNavbar({
  brand,
  items,
  accent = "#8b5cf6",
  background = "#0f0f10",
  className,
  style,
  ...props
}: MegaNavbarProps) {
  const reduce = useReducedMotion();
  useInjectedKeyframes("pb-mega-navbar-kf", KEYFRAMES);

  const reactId = React.useId();
  const pillId = `pb-mnav-pill-${reactId}`;
  const sheetId = `pb-mnav-sheet-${reactId}`;
  const mobileId = `pb-mnav-mobile-${reactId}`;

  const navRef = React.useRef<HTMLElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const topRefs = React.useRef<Array<HTMLElement | null>>([]);
  const hamburgerRef = React.useRef<HTMLButtonElement | null>(null);

  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [mobileSection, setMobileSection] = React.useState<number | null>(null);

  const openPanelIndex =
    activeIndex !== null && items[activeIndex]?.panel ? activeIndex : null;

  // Debounced close so the pointer can cross the gap between bar and sheet.
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = React.useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);
  const scheduleClose = React.useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      if (!navRef.current?.contains(document.activeElement)) {
        setActiveIndex(null);
      }
    }, 110);
  }, [cancelClose]);
  React.useEffect(() => () => cancelClose(), [cancelClose]);

  // Click / tap outside the nav dismisses an open sheet (covers touch too).
  React.useEffect(() => {
    if (activeIndex === null) return;
    const onDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveIndex(null);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [activeIndex]);

  const getLinks = React.useCallback((): HTMLElement[] => {
    const root = panelRef.current;
    if (!root) return [];
    return Array.from(
      root.querySelectorAll<HTMLElement>("[data-pb-mnav-link]")
    );
  }, []);

  const focusFirstLink = React.useCallback(() => {
    requestAnimationFrame(() => getLinks()[0]?.focus());
  }, [getLinks]);

  const spring: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 240, damping: 22, mass: 0.9 };
  const pillSpring: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 260, damping: 24 };
  const contentTween: Transition = reduce
    ? { duration: 0 }
    : { duration: 0.26, ease: EASE };

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const key = e.key;

    if (key === "Escape") {
      if (activeIndex !== null) {
        e.stopPropagation();
        const trigger = topRefs.current[activeIndex];
        setActiveIndex(null);
        trigger?.focus();
      }
      return;
    }

    const activeEl = document.activeElement;
    const tIdx = topRefs.current.findIndex((el) => el === activeEl);

    // Focus currently on a top-level trigger.
    if (tIdx !== -1) {
      if (key === "ArrowRight" || key === "ArrowLeft") {
        e.preventDefault();
        const dir = key === "ArrowRight" ? 1 : -1;
        const next = (tIdx + dir + items.length) % items.length;
        topRefs.current[next]?.focus();
        return;
      }
      if (key === "Home") {
        e.preventDefault();
        topRefs.current[0]?.focus();
        return;
      }
      if (key === "End") {
        e.preventDefault();
        topRefs.current[items.length - 1]?.focus();
        return;
      }
      if (key === "ArrowDown" && items[tIdx]?.panel) {
        e.preventDefault();
        setActiveIndex(tIdx);
        focusFirstLink();
        return;
      }
      // Tab from an open trigger is trapped into (and around) its links.
      if (key === "Tab" && activeIndex === tIdx && items[tIdx]?.panel) {
        const links = getLinks();
        if (links.length) {
          e.preventDefault();
          (e.shiftKey ? links[links.length - 1] : links[0])?.focus();
          return;
        }
      }
    }

    // Focus currently inside the open sheet.
    if (
      activeIndex !== null &&
      items[activeIndex]?.panel &&
      panelRef.current?.contains(activeEl)
    ) {
      const links = getLinks();
      const idx = links.indexOf(activeEl as HTMLElement);
      if (key === "ArrowDown") {
        e.preventDefault();
        links[(idx + 1) % links.length]?.focus();
        return;
      }
      if (key === "ArrowUp") {
        e.preventDefault();
        if (idx <= 0) topRefs.current[activeIndex]?.focus();
        else links[idx - 1]?.focus();
        return;
      }
      if (key === "Home") {
        e.preventDefault();
        links[0]?.focus();
        return;
      }
      if (key === "End") {
        e.preventDefault();
        links[links.length - 1]?.focus();
        return;
      }
      if (key === "Tab") {
        // Trap among [trigger, ...links] with wrap-around.
        const seq = [
          topRefs.current[activeIndex],
          ...links,
        ].filter(Boolean) as HTMLElement[];
        const cur = seq.indexOf(activeEl as HTMLElement);
        if (cur !== -1) {
          e.preventDefault();
          const dir = e.shiftKey ? -1 : 1;
          seq[(cur + dir + seq.length) % seq.length]?.focus();
        }
        return;
      }
    }
  };

  const surface = `color-mix(in srgb, ${background} 72%, transparent)`;

  return (
    <header
      ref={navRef}
      style={
        {
          "--pb-mnav-accent": accent,
          ...style,
        } as React.CSSProperties
      }
      className={cn("sticky top-0 z-50 w-full text-white", className)}
      {...props}
    >
      {/* Translucent, blurred bar. */}
      <div
        style={{ background: surface }}
        className="relative border-b border-white/10 backdrop-blur-xl backdrop-saturate-150"
      >
        <nav
          aria-label="Main"
          onKeyDown={onKeyDown}
          onPointerLeave={(e) => {
            if (e.pointerType !== "touch") scheduleClose();
          }}
          onPointerEnter={cancelClose}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setActiveIndex(null);
            }
          }}
          className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4"
        >
          <div className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight">
            {brand ?? <span>Parable</span>}
          </div>

          <div className="ml-auto flex items-center gap-1">
            {/* Desktop menubar. */}
            <ul className="relative hidden items-center gap-0.5 md:flex">
              {items.map((item, i) => {
                const hasPanel = !!item.panel?.length;
                const isActive = activeIndex === i;
                const isOpen = openPanelIndex === i;

                const inner = (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId={pillId}
                        aria-hidden
                        transition={pillSpring}
                        className="absolute inset-0 overflow-hidden rounded-full bg-white/[0.08] ring-1 ring-inset ring-white/10"
                        style={{
                          boxShadow:
                            "inset 0 1px 0 0 color-mix(in srgb, var(--pb-mnav-accent) 24%, transparent)",
                        }}
                      >
                        {!reduce && (
                          <span
                            aria-hidden
                            className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                            style={{
                              animation:
                                "pb-mega-navbar-kf-sheen 3.4s cubic-bezier(0.22,1,0.36,1) infinite",
                            }}
                          />
                        )}
                      </motion.span>
                    )}
                    <span className="relative z-[1]">{item.label}</span>
                    {hasPanel && (
                      <ChevronDown
                        aria-hidden
                        strokeWidth={2.25}
                        className={cn(
                          "relative z-[1] size-3.5 transition-transform duration-200",
                          isOpen && "rotate-180"
                        )}
                      />
                    )}
                  </>
                );

                const baseClass = cn(
                  "relative flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium outline-none",
                  "text-white/70 transition-colors duration-200 hover:text-white",
                  isActive && "text-white",
                  "focus-visible:ring-2 focus-visible:ring-offset-0",
                  "focus-visible:ring-[color:var(--pb-mnav-accent)]"
                );

                return (
                  <li key={i} className="relative">
                    {hasPanel ? (
                      <button
                        type="button"
                        ref={(el) => {
                          topRefs.current[i] = el;
                        }}
                        aria-haspopup="true"
                        aria-expanded={isOpen}
                        aria-controls={isOpen ? sheetId : undefined}
                        onPointerEnter={(e) => {
                          if (e.pointerType === "touch") return;
                          cancelClose();
                          setActiveIndex(i);
                        }}
                        onFocus={() => setActiveIndex(i)}
                        onClick={(e) => {
                          setActiveIndex(i);
                          // Keyboard activation (detail === 0) drills into links.
                          if (e.detail === 0) focusFirstLink();
                        }}
                        className={baseClass}
                      >
                        {inner}
                      </button>
                    ) : (
                      <a
                        ref={(el) => {
                          topRefs.current[i] = el;
                        }}
                        href={item.href ?? "#"}
                        onPointerEnter={(e) => {
                          if (e.pointerType === "touch") return;
                          cancelClose();
                          setActiveIndex(i);
                        }}
                        onFocus={() => setActiveIndex(i)}
                        onClick={() => setActiveIndex(null)}
                        className={baseClass}
                      >
                        {inner}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Mobile hamburger. */}
            <button
              type="button"
              ref={hamburgerRef}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls={mobileId}
              onClick={() => {
                setMobileOpen((v) => !v);
                setMobileSection(null);
              }}
              className={cn(
                "grid size-9 place-items-center rounded-full text-white/80 outline-none md:hidden",
                "transition-colors hover:bg-white/5 hover:text-white",
                "focus-visible:ring-2 focus-visible:ring-[color:var(--pb-mnav-accent)]"
              )}
            >
              <AnimatePresence initial={false} mode="wait">
                {mobileOpen ? (
                  <motion.span
                    key="x"
                    initial={reduce ? false : { rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { rotate: 90, opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.18, ease: EASE }}
                  >
                    <X aria-hidden className="size-5" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={reduce ? false : { rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { rotate: -90, opacity: 0 }}
                    transition={{ duration: reduce ? 0 : 0.18, ease: EASE }}
                  >
                    <Menu aria-hidden className="size-5" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Desktop mega sheet. */}
          <AnimatePresence>
            {openPanelIndex !== null && (
              <motion.div
                key="sheet"
                id={sheetId}
                role="region"
                aria-label={`${items[openPanelIndex].label} menu`}
                ref={panelRef}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={spring}
                onPointerEnter={cancelClose}
                className="absolute inset-x-0 top-full px-4"
              >
                <div
                  style={{ background: surface }}
                  className={cn(
                    "mx-auto mt-2 max-w-6xl overflow-hidden rounded-2xl border border-white/10",
                    "shadow-[0_24px_60px_-24px_rgba(0,0,0,0.75)] backdrop-blur-xl backdrop-saturate-150"
                  )}
                >
                  <div
                    aria-hidden
                    className="h-px w-full"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, color-mix(in srgb, var(--pb-mnav-accent) 55%, transparent), transparent)",
                    }}
                  />
                  <motion.div
                    key={openPanelIndex}
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={contentTween}
                    className="grid gap-x-8 gap-y-6 p-6"
                    style={{
                      gridTemplateColumns: `repeat(${
                        items[openPanelIndex].panel!.length
                      }, minmax(0, 1fr))`,
                    }}
                  >
                    {items[openPanelIndex].panel!.map((col, ci) => (
                      <div key={ci} className="min-w-0">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                          {col.title}
                        </p>
                        <ul className="space-y-0.5">
                          {col.links.map((link, li) => (
                            <li key={li}>
                              <a
                                data-pb-mnav-link
                                href={link.href ?? "#"}
                                onClick={() => setActiveIndex(null)}
                                className={cn(
                                  "group/link flex gap-3 rounded-xl p-2 outline-none",
                                  "transition-colors duration-200 hover:bg-white/[0.06]",
                                  "focus-visible:ring-2 focus-visible:ring-inset",
                                  "focus-visible:ring-[color:var(--pb-mnav-accent)]"
                                )}
                              >
                                {link.icon && (
                                  <span
                                    aria-hidden
                                    className={cn(
                                      "mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg",
                                      "bg-white/5 text-white/80 ring-1 ring-inset ring-white/10",
                                      "transition-colors group-hover/link:text-white",
                                      "[&_svg]:size-4"
                                    )}
                                  >
                                    {link.icon}
                                  </span>
                                )}
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-medium text-white/90">
                                    {link.label}
                                  </span>
                                  {link.desc && (
                                    <span className="mt-0.5 block truncate text-xs text-white/50">
                                      {link.desc}
                                    </span>
                                  )}
                                </span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </div>

      {/* Mobile disclosure menu. */}
      <AnimatePresence initial={false}>
        {mobileOpen && (
          <motion.div
            key="mobile"
            id={mobileId}
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 220, damping: 28, mass: 0.9 }
            }
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setMobileOpen(false);
                hamburgerRef.current?.focus();
              }
            }}
            style={{ overflow: "hidden", background: surface }}
            className="border-b border-white/10 backdrop-blur-xl md:hidden"
          >
            <ul className="mx-auto max-h-[70vh] max-w-6xl space-y-1 overflow-y-auto px-4 py-4">
              {items.map((item, i) => {
                const hasPanel = !!item.panel?.length;
                const sectionOpen = mobileSection === i;
                const secId = `${mobileId}-sec-${i}`;
                if (!hasPanel) {
                  return (
                    <li key={i}>
                      <a
                        href={item.href ?? "#"}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 outline-none",
                          "transition-colors hover:bg-white/5 hover:text-white",
                          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--pb-mnav-accent)]"
                        )}
                      >
                        {item.label}
                      </a>
                    </li>
                  );
                }
                return (
                  <li key={i}>
                    <button
                      type="button"
                      aria-expanded={sectionOpen}
                      aria-controls={secId}
                      onClick={() =>
                        setMobileSection((v) => (v === i ? null : i))
                      }
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium outline-none",
                        "text-white/80 transition-colors hover:bg-white/5 hover:text-white",
                        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--pb-mnav-accent)]"
                      )}
                    >
                      {item.label}
                      <ChevronDown
                        aria-hidden
                        strokeWidth={2.25}
                        className={cn(
                          "size-4 text-white/50 transition-transform duration-200",
                          sectionOpen && "rotate-180"
                        )}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {sectionOpen && (
                        <motion.div
                          id={secId}
                          initial={
                            reduce ? { opacity: 0 } : { height: 0, opacity: 0 }
                          }
                          animate={
                            reduce
                              ? { opacity: 1 }
                              : { height: "auto", opacity: 1 }
                          }
                          exit={
                            reduce ? { opacity: 0 } : { height: 0, opacity: 0 }
                          }
                          transition={
                            reduce
                              ? { duration: 0 }
                              : { duration: 0.24, ease: EASE }
                          }
                          style={{ overflow: "hidden" }}
                        >
                          <div className="space-y-4 px-2 pb-3 pt-2">
                            {item.panel!.map((col, ci) => (
                              <div key={ci}>
                                <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                                  {col.title}
                                </p>
                                <ul className="space-y-0.5">
                                  {col.links.map((link, li) => (
                                    <li key={li}>
                                      <a
                                        href={link.href ?? "#"}
                                        onClick={() => setMobileOpen(false)}
                                        className={cn(
                                          "flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-white/75 outline-none",
                                          "transition-colors hover:bg-white/5 hover:text-white",
                                          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--pb-mnav-accent)]"
                                        )}
                                      >
                                        {link.icon && (
                                          <span
                                            aria-hidden
                                            className="grid size-7 shrink-0 place-items-center rounded-md bg-white/5 text-white/70 ring-1 ring-inset ring-white/10 [&_svg]:size-4"
                                          >
                                            {link.icon}
                                          </span>
                                        )}
                                        <span className="truncate">
                                          {link.label}
                                        </span>
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default MegaNavbar;
