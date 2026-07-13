"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "motion/react";
import { CornerDownLeft, Search, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";

/* Brand palette — mirrors the site's --pb-* tokens. */
const PB_VIOLET = "#8b5cf6";
const PB_FUCHSIA = "#ec4899";
const PB_SIGNAL = "#22d3ee";
const PB_INK = "#0f0f10";

/**
 * Inject a `<style>` with keyframes once per document, client-side only. Shared
 * across every instance by id, never torn down (cheap, id-guarded), and kept
 * out of render so server and first client paint agree.
 */
function useInjectedKeyframes(id: string, css: string): void {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }, [id, css]);
}

/** Controlled/uncontrolled state helper with a stable setter. */
function useControllableState(
  controlled: boolean | undefined,
  defaultValue: boolean,
  onChange?: (value: boolean) => void
) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled : uncontrolled;
  const setValue = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolled(next);
      onChange?.(next);
    },
    [isControlled, onChange]
  );
  return [value, setValue] as const;
}

/** True for elements that own text entry, so the global hotkey stays out of the way. */
function isEditableElement(el: Element | null): boolean {
  if (!el) return false;
  const node = el as HTMLElement;
  const tag = node.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return node.isContentEditable === true;
}

/**
 * Substring-first fuzzy test: a direct substring hit always matches; otherwise
 * the query must appear as an in-order subsequence of `label + keywords`. Both
 * sides are lower-cased by the caller.
 */
function fuzzyMatch(query: string, label: string, keywords?: string[]): boolean {
  if (!query) return true;
  const hay = (label + " " + (keywords ? keywords.join(" ") : "")).toLowerCase();
  if (hay.includes(query)) return true;
  let qi = 0;
  for (let i = 0; i < hay.length && qi < query.length; i += 1) {
    if (hay[i] === query[qi]) qi += 1;
  }
  return qi === query.length;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface CommandPaletteItem {
  /** Stable id, unique within the palette. */
  id: string;
  /** Primary line shown in the row and matched against. */
  label: string;
  /** Optional leading glyph — a lucide icon or any node. */
  icon?: React.ReactNode;
  /** Trailing shortcut hint, e.g. "⌘P". Display only. */
  shortcut?: string;
  /** Extra terms folded into the fuzzy match (synonyms, ids). */
  keywords?: string[];
  /** Runs when the row is chosen (Enter or click); the palette then closes. */
  onSelect?: () => void;
}

export interface CommandPaletteGroup {
  /** Section label rendered above its items. */
  heading: string;
  items: CommandPaletteItem[];
}

export interface CommandPaletteProps {
  /** Grouped, filterable commands. Empty groups are hidden automatically. */
  groups: CommandPaletteGroup[];
  /** Controlled open state. Pair with `onOpenChange`. */
  open?: boolean;
  /** Fires with the next open state whenever the palette opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Bind the global ⌘K / Ctrl+K toggle (skipped while typing elsewhere). */
  hotkey?: boolean;
  /** Search field placeholder. */
  placeholder?: string;
  /** Shown when nothing matches the query. */
  emptyMessage?: React.ReactNode;
  /** Accent for the active row, focus ring and sheen. Mirrors `--pb-violet`. */
  accent?: string;
  /** Surface colour. Mirrors `--pb-ink`. */
  background?: string;
  /** Extra classes on the dialog surface. */
  className?: string;
}

/**
 * CommandPalette — a self-written ⌘K palette (no cmdk dependency). ⌘K / Ctrl+K
 * springs a modal dialog in from the top with a scale + fade; a search field
 * substring/subsequence-filters grouped commands as you type. Arrow keys move
 * the active row (wrapping, with Home/End), Enter runs it, Escape closes, and
 * the active row is kept scrolled into view. It renders through a `createPortal`
 * to `document.body`, locks body scroll, traps Tab inside the dialog and returns
 * focus to the previously-focused element on close.
 *
 * Fully a11y-wired: `role="dialog" aria-modal`, a `role="combobox"` input driving
 * `aria-activedescendant` over a `role="listbox"`, `role="group"` sections and
 * `role="option"` rows. Works controlled (`open` / `onOpenChange`) or self-managed
 * via the hotkey. Under `prefers-reduced-motion` every transition is instant and
 * the ambient sheen holds still. Colour defaults mirror the site's `--pb-*`
 * tokens (accent = violet #8b5cf6, surface = ink #0f0f10; the sheen sweeps
 * violet #8b5cf6 → fuchsia #ec4899 → signal #22d3ee).
 *
 * @parable/command-palette
 */
export function CommandPalette({
  groups,
  open: openProp,
  onOpenChange,
  hotkey = true,
  placeholder = "Search commands…",
  emptyMessage = "No matching commands",
  accent = PB_VIOLET,
  background = PB_INK,
  className,
}: CommandPaletteProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useControllableState(openProp, false, onOpenChange);

  const [mounted, setMounted] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);

  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const openRef = React.useRef(open);
  openRef.current = open;

  useInjectedKeyframes(
    "pb-command-palette-kf",
    "@keyframes pb-command-palette-kf-sheen{0%{background-position:0% 50%}100%{background-position:200% 50%}}"
  );

  const baseId = React.useId();
  const listboxId = `${baseId}-listbox`;
  const inputId = `${baseId}-input`;
  const optionDomId = React.useCallback(
    (i: number) => `${baseId}-opt-${i}`,
    [baseId]
  );

  React.useEffect(() => setMounted(true), []);

  // Filter each group, drop the empties, and keep a flat view for navigation.
  const filteredGroups = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: CommandPaletteGroup[] = [];
    for (const group of groups) {
      const items = group.items.filter((it) =>
        fuzzyMatch(q, it.label, it.keywords)
      );
      if (items.length > 0) out.push({ heading: group.heading, items });
    }
    return out;
  }, [groups, query]);

  const flat = React.useMemo(
    () => filteredGroups.flatMap((g) => g.items),
    [filteredGroups]
  );

  // Reset the query + selection each time the palette opens.
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  // A new query always re-homes the highlight to the top of the results.
  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keep the highlight in range as results shrink.
  React.useEffect(() => {
    setActiveIndex((i) => (flat.length === 0 ? 0 : Math.min(i, flat.length - 1)));
  }, [flat.length]);

  // Focus the input on open, lock body scroll, and restore focus on close.
  React.useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  // Keep the active row visible as the highlight moves.
  React.useEffect(() => {
    if (!open) return;
    const el = document.getElementById(optionDomId(activeIndex));
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, flat.length, optionDomId]);

  // Global ⌘K / Ctrl+K toggle — skipped while typing outside the palette.
  React.useEffect(() => {
    if (!hotkey || typeof document === "undefined") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        const target = e.target as Element | null;
        const inPalette = !!dialogRef.current?.contains(target);
        if (!inPalette && isEditableElement(target)) return;
        e.preventDefault();
        setOpen(!openRef.current);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [hotkey, setOpen]);

  const runItem = React.useCallback(
    (item: CommandPaletteItem) => {
      setOpen(false);
      item.onSelect?.();
    },
    [setOpen]
  );

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
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) =>
          flat.length === 0 ? 0 : (i + 1) % flat.length
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) =>
          flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length
        );
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(Math.max(0, flat.length - 1));
        break;
      case "Enter": {
        e.preventDefault();
        const item = flat[activeIndex];
        if (item) runItem(item);
        break;
      }
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        trapTab(e);
        break;
      default:
        break;
    }
  };

  const overlayTransition: Transition = reduce
    ? { duration: 0 }
    : { duration: 0.18, ease: [0.22, 1, 0.36, 1] };
  const panelTransition: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 240, damping: 22, mass: 0.9 };

  const activeBg = `color-mix(in srgb, ${accent} 16%, transparent)`;
  const activeDomId = flat.length > 0 ? optionDomId(activeIndex) : undefined;

  let cursor = -1;

  const surface = mounted
    ? createPortal(
        <AnimatePresence>
          {open && (
            <div
              className="fixed inset-0 flex items-start justify-center p-4 sm:p-6"
              style={{ zIndex: 2147483646 }}
            >
              <motion.div
                aria-hidden
                onClick={() => setOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={overlayTransition}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />

              <motion.div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label="Command palette"
                onKeyDown={onDialogKeyDown}
                initial={
                  reduce
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.96, y: 8 }
                }
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 0 }}
                transition={panelTransition}
                style={
                  {
                    background,
                    transformOrigin: "top center",
                    "--pb-cp-accent": accent,
                  } as React.CSSProperties
                }
                className={cn(
                  "relative mt-[12vh] flex max-h-[70vh] w-full max-w-xl flex-col",
                  "overflow-hidden rounded-2xl border border-white/10 text-white",
                  "shadow-[0_28px_80px_-24px_rgba(0,0,0,0.85)]",
                  className
                )}
              >
                {/* Ambient brand sheen along the top hairline — decorative. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${PB_VIOLET}, ${PB_FUCHSIA}, ${PB_SIGNAL}, transparent)`,
                    backgroundSize: "200% 100%",
                    animation: reduce
                      ? undefined
                      : "pb-command-palette-kf-sheen 6s linear infinite",
                  }}
                />

                {/* Search row */}
                <div className="flex items-center gap-3 border-b border-white/10 px-4">
                  <Search
                    aria-hidden
                    className="size-5 shrink-0 text-white/40"
                    strokeWidth={2}
                  />
                  <input
                    ref={inputRef}
                    id={inputId}
                    role="combobox"
                    aria-expanded="true"
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    aria-activedescendant={activeDomId}
                    aria-label={placeholder}
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={query}
                    placeholder={placeholder}
                    onChange={(e) => setQuery(e.target.value)}
                    className={cn(
                      "h-14 w-full bg-transparent text-[15px] text-white",
                      "placeholder:text-white/35 outline-none"
                    )}
                  />
                  <kbd
                    aria-hidden
                    className="hidden shrink-0 rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-white/45 sm:inline-block"
                  >
                    esc
                  </kbd>
                </div>

                {/* Results */}
                <div
                  role="listbox"
                  id={listboxId}
                  aria-label="Commands"
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2"
                >
                  {filteredGroups.length === 0 ? (
                    <div
                      role="presentation"
                      className="flex flex-col items-center gap-2 px-4 py-10 text-center"
                    >
                      <SearchX
                        aria-hidden
                        className="size-6 text-white/25"
                        strokeWidth={1.75}
                      />
                      <p className="text-sm text-white/45">{emptyMessage}</p>
                    </div>
                  ) : (
                    filteredGroups.map((group, gi) => {
                      const headingId = `${baseId}-group-${gi}`;
                      return (
                        <div
                          key={`${group.heading}-${gi}`}
                          role="group"
                          aria-labelledby={headingId}
                          className="px-2 pb-1"
                        >
                          <div
                            id={headingId}
                            className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-white/35"
                          >
                            {group.heading}
                          </div>
                          {group.items.map((item) => {
                            cursor += 1;
                            const idx = cursor;
                            const active = idx === activeIndex;
                            return (
                              <div
                                key={item.id}
                                id={optionDomId(idx)}
                                role="option"
                                aria-selected={active}
                                data-active={active}
                                onMouseEnter={() => setActiveIndex(idx)}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => runItem(item)}
                                className={cn(
                                  "relative flex cursor-pointer items-center gap-3",
                                  "mx-0 rounded-lg px-3 py-2.5 text-sm",
                                  "transition-colors duration-100",
                                  active ? "text-white" : "text-white/70"
                                )}
                                style={
                                  active ? { backgroundColor: activeBg } : undefined
                                }
                              >
                                <span
                                  aria-hidden
                                  className={cn(
                                    "absolute left-0 top-1/2 -translate-y-1/2 rounded-full transition-all duration-150",
                                    active ? "h-5 w-[3px]" : "h-0 w-0"
                                  )}
                                  style={{ backgroundColor: accent }}
                                />
                                {item.icon != null && (
                                  <span
                                    aria-hidden
                                    className={cn(
                                      "grid size-5 shrink-0 place-items-center",
                                      active ? "text-white" : "text-white/50",
                                      "[&_svg]:size-[18px]"
                                    )}
                                  >
                                    {item.icon}
                                  </span>
                                )}
                                <span className="min-w-0 flex-1 truncate">
                                  {item.label}
                                </span>
                                {item.shortcut ? (
                                  <kbd className="shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-white/50">
                                    {item.shortcut}
                                  </kbd>
                                ) : (
                                  active && (
                                    <CornerDownLeft
                                      aria-hidden
                                      className="size-4 shrink-0 text-white/40"
                                      strokeWidth={2}
                                    />
                                  )
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer hints */}
                <div className="flex items-center gap-4 border-t border-white/10 px-4 py-2.5 text-[11px] text-white/40">
                  <span className="flex items-center gap-1.5">
                    <kbd className="rounded border border-white/15 bg-white/5 px-1 py-0.5 font-mono">
                      ↑
                    </kbd>
                    <kbd className="rounded border border-white/15 bg-white/5 px-1 py-0.5 font-mono">
                      ↓
                    </kbd>
                    <span>navigate</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="rounded border border-white/15 bg-white/5 px-1 py-0.5 font-mono">
                      ↵
                    </kbd>
                    <span>select</span>
                  </span>
                  <span className="ml-auto flex items-center gap-1.5">
                    <kbd className="rounded border border-white/15 bg-white/5 px-1 py-0.5 font-mono">
                      esc
                    </kbd>
                    <span>close</span>
                  </span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )
    : null;

  return surface;
}

export default CommandPalette;
