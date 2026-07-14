"use client";

import * as React from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Inject a <style> block once per unique id (SSR-safe, idempotent). */
function useInjectedKeyframes(id: string, css: string) {
  React.useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/** The four axes the toolbar can grow along, relative to the trigger. */
export type FamilyButtonDirection = "up" | "down" | "left" | "right";

export interface FamilyButtonAction {
  /** Leading glyph, e.g. a lucide icon. Rendered decorative (`aria-hidden`). */
  icon: React.ReactNode;
  /** Visible text and the button's accessible name. */
  label: string;
  /** Fires when the item is chosen; the toolbar then collapses. */
  onSelect?: () => void;
}

export interface FamilyButtonProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Trigger face. Defaults to a `+` glyph that rotates into an `×` when open. */
  trigger?: React.ReactNode;
  /** Toolbar items, revealed in order. Item 0 sits nearest the trigger. */
  actions: FamilyButtonAction[];
  /** Which way the toolbar unfurls from the trigger. Defaults to `up`. */
  expandDirection?: FamilyButtonDirection;
  /** Trigger fill + focus ring. Mirrors the site `--pb-violet` token. */
  accent?: string;
  /** Toolbar surface colour. Mirrors the site `--pb-ink` token. */
  background?: string;
}

/** Anchor + flow classes for the morphing shell, per direction. */
const SHELL_CLASS: Record<FamilyButtonDirection, string> = {
  down: "left-0 top-0 flex-col items-start",
  up: "left-0 bottom-0 flex-col items-start",
  right: "left-0 top-0 flex-row items-center",
  left: "right-0 top-0 flex-row items-center",
};

/**
 * Toolbar flow: reversed on `up`/`left` so DOM order (= focus/Tab order) still
 * runs item 0 → n while item 0 renders nearest the trigger.
 */
const LIST_CLASS: Record<FamilyButtonDirection, string> = {
  down: "flex-col",
  up: "flex-col-reverse",
  right: "flex-row",
  left: "flex-row-reverse",
};

/** The trigger leads for outward-growing axes; trails for the anchored ones. */
const TRIGGER_FIRST: Record<FamilyButtonDirection, boolean> = {
  down: true,
  right: true,
  up: false,
  left: false,
};

/** Entrance offset (px) — items slide out from the trigger side. */
const ENTER_OFFSET: Record<FamilyButtonDirection, { x?: number; y?: number }> = {
  down: { y: -8 },
  up: { y: 8 },
  right: { x: -8 },
  left: { x: 8 },
};

/** Arrow keys that advance / retreat focus, mapped to the visual layout. */
const ARROW_KEYS: Record<
  FamilyButtonDirection,
  { next: string; prev: string }
> = {
  down: { next: "ArrowDown", prev: "ArrowUp" },
  up: { next: "ArrowUp", prev: "ArrowDown" },
  right: { next: "ArrowRight", prev: "ArrowLeft" },
  left: { next: "ArrowLeft", prev: "ArrowRight" },
};

/**
 * FamilyButton — a compact circular action button that spring-morphs (Motion
 * layout animation, stiffness 210 / damping 22) into a rounded toolbar and back.
 * Click the trigger and the ink surface grows out along `expandDirection`
 * (up / down / left / right) while a row or column of icon + label actions
 * staggers in from the trigger side; the `+` glyph rotates into an `×`.
 *
 * It is a genuine disclosure: the trigger carries `aria-expanded` /
 * `aria-controls`, the revealed actions are real `<button>`s in a labelled
 * group, Escape or an outside press collapses it, focus moves to the first
 * action on open and returns to the trigger on close, and Arrow / Home / End
 * rove focus along the toolbar's visual axis. Under `prefers-reduced-motion`
 * the morph, stagger, and idle glow are dropped — it expands and collapses
 * instantly and stays fully legible.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (accent violet `#8b5cf6`
 * on ink `#0f0f10`). Clean-room original inspired by the Cult UI Family Button
 * genre — credit upstream, no code copied.
 *
 * @parable/family-button
 */
export function FamilyButton({
  trigger,
  actions,
  expandDirection = "up",
  accent = "#8b5cf6",
  background = "#0f0f10",
  className,
  style,
  onKeyDown,
  ...rest
}: FamilyButtonProps) {
  const reduce = useReducedMotion() ?? false;

  useInjectedKeyframes(
    "pb-family-button-kf",
    "@keyframes pb-fb-breathe{0%,100%{opacity:.28;transform:scale(1)}50%{opacity:.5;transform:scale(1.12)}}" +
      ".pb-fb-breathe{animation:pb-fb-breathe 3.6s ease-in-out infinite}" +
      "@media (prefers-reduced-motion:reduce){.pb-fb-breathe{animation:none!important;opacity:.3!important;transform:none!important}}"
  );

  const [open, setOpen] = React.useState(false);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const actionRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const panelId = `pb-fb-panel-${uid}`;

  const dir = expandDirection;
  const hasActions = actions.length > 0;
  const usingDefaultTrigger = trigger == null;

  const close = React.useCallback((focusTrigger: boolean) => {
    setOpen(false);
    if (focusTrigger) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  const toggle = () => (open ? close(false) : setOpen(true));

  // On open, hand focus to the first action once it has mounted.
  React.useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => actionRefs.current[0]?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Outside press collapses without stealing focus back to the trigger.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const onRootKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (open && e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    }
  };

  const onActionsKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ARROW_KEYS[dir];
    const last = actions.length - 1;
    const cur = actionRefs.current.findIndex(
      (el) => el === document.activeElement
    );
    let next: number | null = null;
    if (e.key === keys.next) next = cur < 0 ? 0 : Math.min(last, cur + 1);
    else if (e.key === keys.prev) next = cur < 0 ? 0 : Math.max(0, cur - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    else return;
    e.preventDefault();
    actionRefs.current[next]?.focus();
  };

  const handleSelect = (action: FamilyButtonAction) => {
    action.onSelect?.();
    close(true);
  };

  const layoutTransition: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 210, damping: 22, mass: 0.9 };
  const itemTransition: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 240, damping: 20, mass: 0.7 };
  const iconTransition: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 260, damping: 20 };

  const listVariants: Variants = {
    hidden: { transition: { staggerChildren: 0, staggerDirection: -1 } },
    visible: {
      transition: {
        staggerChildren: reduce ? 0 : 0.05,
        delayChildren: reduce ? 0 : 0.03,
      },
    },
  };
  const itemVariants: Variants = {
    hidden: reduce
      ? { opacity: 0 }
      : { opacity: 0, scale: 0.9, ...ENTER_OFFSET[dir] },
    visible: { opacity: 1, scale: 1, x: 0, y: 0, transition: itemTransition },
  };

  const vars = {
    "--pb-fb-accent": accent,
    "--pb-fb-bg": background,
  } as React.CSSProperties;

  const triggerEl = (
    <motion.button
      ref={triggerRef}
      type="button"
      layout={!reduce}
      transition={layoutTransition}
      onClick={toggle}
      aria-expanded={open}
      aria-controls={panelId}
      aria-haspopup="true"
      aria-label={open ? "Close actions" : "Open actions"}
      whileTap={reduce ? undefined : { scale: 0.92 }}
      className={cn(
        "relative z-10 grid size-14 shrink-0 place-items-center rounded-full",
        "text-white outline-none",
        "focus-visible:ring-2 focus-visible:ring-[var(--pb-fb-accent)]",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pb-fb-bg)]"
      )}
      style={{
        background: `linear-gradient(180deg, ${accent}, ${accent}dd)`,
        boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.28), 0 10px 26px -8px ${accent}b3`,
      }}
    >
      <motion.span
        aria-hidden={usingDefaultTrigger}
        className="grid place-items-center"
        animate={{ rotate: open && usingDefaultTrigger ? 45 : 0 }}
        transition={iconTransition}
      >
        {trigger ?? <Plus className="size-6" strokeWidth={2.5} aria-hidden />}
      </motion.span>
    </motion.button>
  );

  const actionsEl = (
    <AnimatePresence mode="popLayout" initial={false}>
      {open && hasActions && (
        <motion.div
          key="pb-fb-actions"
          id={panelId}
          role="group"
          aria-label="Actions"
          layout={!reduce}
          onKeyDown={onActionsKeyDown}
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={listVariants}
          className={cn("flex gap-1.5", LIST_CLASS[dir])}
        >
          {actions.map((action, i) => (
            <motion.button
              key={i}
              ref={(el) => {
                actionRefs.current[i] = el;
              }}
              type="button"
              variants={itemVariants}
              onClick={() => handleSelect(action)}
              className={cn(
                "group inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-xl px-2.5",
                "text-sm font-medium text-white/85 outline-none",
                "transition-colors duration-200 hover:bg-white/10 hover:text-white",
                "focus-visible:ring-2 focus-visible:ring-[var(--pb-fb-accent)]",
                "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pb-fb-bg)]"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg",
                  "bg-white/10 text-white/90 transition-colors duration-200",
                  "[&_svg]:size-[1.05rem] group-hover:bg-white/15"
                )}
              >
                {action.icon}
              </span>
              <span>{action.label}</span>
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div
      ref={rootRef}
      className={cn("relative inline-block size-14", className)}
      style={{ ...vars, ...style }}
      onKeyDown={onRootKeyDown}
      {...rest}
    >
      {!open && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -z-10 rounded-full",
            !reduce && "pb-fb-breathe"
          )}
          style={{
            left: -4,
            top: -4,
            width: 64,
            height: 64,
            background: `radial-gradient(circle, ${accent}66, transparent 70%)`,
            filter: "blur(10px)",
          }}
        />
      )}

      <motion.div
        layout={!reduce}
        transition={layoutTransition}
        className={cn(
          "absolute flex overflow-hidden",
          open ? "gap-2 p-2" : "gap-0 p-0",
          SHELL_CLASS[dir]
        )}
        style={{
          background,
          borderRadius: open ? 22 : 28,
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.08), 0 20px 50px -20px rgba(0,0,0,0.7)",
        }}
      >
        {TRIGGER_FIRST[dir] ? (
          <>
            {triggerEl}
            {actionsEl}
          </>
        ) : (
          <>
            {actionsEl}
            {triggerEl}
          </>
        )}
      </motion.div>
    </div>
  );
}

export default FamilyButton;
