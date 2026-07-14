"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** Round a float to 3 decimals — full-precision floats trip React hydration. */
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Clamp `n` into the inclusive `[lo, hi]` range. */
const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

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

export interface KanbanCard {
  /** Stable unique id — used as the React key and drag identity. */
  id: string;
  /** Card body text. */
  title: string;
  /** Optional short label chip (e.g. "Bug", "Design"). */
  tag?: string;
  /** Optional assignee/priority dot colour (any CSS colour). */
  color?: string;
}

export interface KanbanColumn {
  /** Stable unique id. */
  id: string;
  /** Column heading, e.g. "To Do". */
  title: string;
  /** Ordered cards in this column. */
  cards: KanbanCard[];
}

export interface KanbanBoardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Columns and their cards. Ships a small default board when omitted. */
  columns?: KanbanColumn[];
  /** Fired with the next board after any move (drag drop or keyboard). */
  onChange?: (columns: KanbanColumn[]) => void;
}

interface DragState {
  cardId: string;
  fromCol: string;
  /** Hovered column id. */
  overCol: string;
  /** Insertion index within the hovered column, excluding the dragged card. */
  overIndex: number;
  /** Grabbed card box, so the placeholder and overlay match its size. */
  width: number;
  height: number;
  /** True while the drop is springing home; owns the overlay transform. */
  settling: boolean;
}

interface Geom {
  cardId: string;
  fromCol: string;
  grabX: number;
  grabY: number;
  width: number;
  height: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  active: boolean;
  /** Last transform written to the overlay, re-asserted after every render. */
  tf: string;
}

const DEFAULT_COLUMNS: KanbanColumn[] = [
  {
    id: "todo",
    title: "To Do",
    cards: [
      { id: "c1", title: "Draft the onboarding email sequence", tag: "Growth", color: "#22d3ee" },
      { id: "c2", title: "Audit color contrast on the pricing page", tag: "A11y", color: "#8b5cf6" },
      { id: "c3", title: "Collect Q3 churn survey responses", tag: "Research", color: "#f5a623" },
    ],
  },
  {
    id: "doing",
    title: "In Progress",
    cards: [
      { id: "c4", title: "Rebuild the settings nav as a command menu", tag: "Feature", color: "#ec4899" },
      { id: "c5", title: "Migrate avatars to the new CDN", tag: "Infra", color: "#22d3ee" },
    ],
  },
  {
    id: "done",
    title: "Done",
    cards: [
      { id: "c6", title: "Ship dark-mode token pass", tag: "Design", color: "#8b5cf6" },
      { id: "c7", title: "Fix flaky checkout e2e test", tag: "Bug", color: "#f5a623" },
    ],
  },
];

/** Locate a card's index inside a given column. */
function indexOfCard(cols: KanbanColumn[], colId: string, cardId: string): number {
  const col = cols.find((c) => c.id === colId);
  return col ? col.cards.findIndex((c) => c.id === cardId) : -1;
}

/**
 * Immutably move `cardId` from `fromCol` to `toCol` at `toIndex`. Card object
 * identity is preserved; only the containing arrays are rebuilt.
 */
function applyMove(
  cols: KanbanColumn[],
  cardId: string,
  fromCol: string,
  toCol: string,
  toIndex: number
): KanbanColumn[] {
  const source = cols.find((c) => c.id === fromCol);
  const card = source?.cards.find((c) => c.id === cardId);
  if (!card) return cols;
  return cols.map((col) => {
    if (col.id === fromCol && col.id === toCol) {
      const arr = col.cards.filter((c) => c.id !== cardId);
      arr.splice(clamp(toIndex, 0, arr.length), 0, card);
      return { ...col, cards: arr };
    }
    if (col.id === fromCol) {
      return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
    }
    if (col.id === toCol) {
      const arr = col.cards.slice();
      arr.splice(clamp(toIndex, 0, arr.length), 0, card);
      return { ...col, cards: arr };
    }
    return col;
  });
}

type DisplayItem =
  | { kind: "card"; card: KanbanCard }
  | { kind: "placeholder" };

/** Build the render model: drop the airborne card from its source, insert a gap. */
function computeDisplay(
  board: KanbanColumn[],
  drag: DragState | null
): Array<{ col: KanbanColumn; items: DisplayItem[] }> {
  return board.map((col) => {
    let cards = col.cards;
    if (drag && col.id === drag.fromCol) {
      cards = cards.filter((c) => c.id !== drag.cardId);
    }
    const items: DisplayItem[] = cards.map((card) => ({ kind: "card", card }));
    if (drag && col.id === drag.overCol) {
      items.splice(clamp(drag.overIndex, 0, items.length), 0, {
        kind: "placeholder",
      });
    }
    return { col, items };
  });
}

const CARD_FACE =
  "rounded-lg border border-white/10 bg-[linear-gradient(180deg,#191a1e,#141416)] " +
  "px-3 py-2.5 text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]";

/** The visual body of a card, reused by the list and the drag overlay. */
function CardFace({ card }: { card: KanbanCard }) {
  return (
    <>
      {(card.tag || card.color) && (
        <div className="mb-1.5 flex items-center gap-2">
          {card.color && (
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-black/40"
              style={{ background: card.color }}
            />
          )}
          {card.tag && (
            <span
              className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-300"
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              {card.tag}
            </span>
          )}
        </div>
      )}
      <p className="text-[13px] font-medium leading-snug text-zinc-100">
        {card.title}
      </p>
    </>
  );
}

/**
 * KanbanBoard — a drag-and-drop task board block (no DnD deps). Pointer-drag a
 * card to reorder it within a column or move it across columns: the lifted card
 * rides an absolutely-positioned overlay that tracks the pointer, a dashed
 * placeholder opens a gap at the hovered slot, and the surrounding cards glide
 * apart via Motion `layout` springs. On release the overlay eases home on a
 * `cubic-bezier(.22,1,.36,1)` settle, then the model commits and `onChange`
 * fires. Hit-testing is done by measuring live card boxes, so it stays accurate
 * mid-animation. A full keyboard path mirrors the drag: focus a card and press
 * Ctrl/Cmd + arrow keys to move it between positions and columns, each move
 * announced through a polite live region. Under `prefers-reduced-motion` there
 * is no lift easing, no gliding gap and no settle — moves land instantly — and
 * the board stays a legible, fully operable static list. Semantics are real
 * lists: each column is a labelled `role="list"` of `listitem`s, each card a
 * focusable `role="button"` with position described to assistive tech.
 *
 * Accent defaults mirror the site `--pb-*` tokens (violet #8b5cf6, fuchsia
 * #ec4899, ember #f5a623, signal #22d3ee on ink #0f0f10).
 *
 * @parable/kanban-board
 */
export function KanbanBoard({
  columns,
  onChange,
  className,
  ...props
}: KanbanBoardProps) {
  useInjectedKeyframes(
    "pb-kanban-board-kf",
    "@keyframes pb-kanban-board-ph{0%,100%{opacity:.55}50%{opacity:.9}}" +
      ".pb-kanban-board-ph{animation:pb-kanban-board-ph 1.6s ease-in-out infinite}" +
      "@media (prefers-reduced-motion:reduce){" +
      ".pb-kanban-board-ph{animation:none}" +
      ".pb-kanban-board-overlay,.pb-kanban-board-lift{transition:none!important}}"
  );

  const reduced = !!useReducedMotion();

  const rawId = React.useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, "");
  const instrId = `pb-kanban-instr-${uid}`;

  const [board, setBoard] = React.useState<KanbanColumn[]>(
    () => columns ?? DEFAULT_COLUMNS
  );
  const [drag, setDrag] = React.useState<DragState | null>(null);
  const [announce, setAnnounce] = React.useState("");

  // Refs the imperative pointer handlers read without re-subscribing.
  const boardRef = React.useRef(board);
  boardRef.current = board;
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const reducedRef = React.useRef(reduced);
  reducedRef.current = reduced;
  const dragRef = React.useRef<DragState | null>(null);

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);
  const geomRef = React.useRef<Geom | null>(null);
  const colEls = React.useRef<Map<string, HTMLElement>>(new Map());
  const cardEls = React.useRef<Map<string, HTMLElement>>(new Map());

  const cleanupRef = React.useRef<(() => void) | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const committedRef = React.useRef(false);
  const pendingFocusRef = React.useRef<string | null>(null);

  const overlayCardRef = React.useRef<KanbanCard | null>(null);

  // Adopt controlled updates from the `columns` prop while idle.
  React.useEffect(() => {
    if (columns && !dragRef.current) setBoard(columns);
  }, [columns]);

  const setDragBoth = React.useCallback((next: DragState | null) => {
    dragRef.current = next;
    setDrag(next);
  }, []);

  const restoreBody = React.useCallback(() => {
    if (typeof document === "undefined") return;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }, []);

  const positionOverlay = React.useCallback((cx: number, cy: number) => {
    const g = geomRef.current;
    const root = rootRef.current;
    const ov = overlayRef.current;
    if (!g || !root) return;
    const rr = root.getBoundingClientRect();
    const x = cx - rr.left - g.grabX;
    const y = cy - rr.top - g.grabY;
    g.tf = `translate3d(${r3(x)}px, ${r3(y)}px, 0)`;
    g.lastX = cx;
    g.lastY = cy;
    if (ov) {
      ov.style.transition = "none";
      ov.style.transform = g.tf;
    }
  }, []);

  // Find the hovered column and the insertion index from live card boxes.
  const computeDrop = React.useCallback(
    (cx: number, cy: number): { overCol: string; overIndex: number } | null => {
      const g = geomRef.current;
      if (!g) return null;
      const cols = boardRef.current;
      let bestCol = g.fromCol;
      let bestDist = Infinity;
      for (const col of cols) {
        const el = colEls.current.get(col.id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const dx =
          cx < r.left ? r.left - cx : cx > r.right ? cx - r.right : 0;
        if (dx < bestDist) {
          bestDist = dx;
          bestCol = col.id;
        }
      }
      const colEl = colEls.current.get(bestCol);
      let index = 0;
      if (colEl) {
        const cards = Array.from(
          colEl.querySelectorAll<HTMLElement>("[data-pb-kanban-card]")
        );
        index = cards.length;
        for (let i = 0; i < cards.length; i++) {
          const r = cards[i].getBoundingClientRect();
          if (cy < r.top + r.height / 2) {
            index = i;
            break;
          }
        }
      }
      return { overCol: bestCol, overIndex: index };
    },
    []
  );

  const commitMove = React.useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const cur = dragRef.current;
    if (cur) {
      const next = applyMove(
        boardRef.current,
        cur.cardId,
        cur.fromCol,
        cur.overCol,
        cur.overIndex
      );
      setBoard(next);
      onChangeRef.current?.(next);
    }
    geomRef.current = null;
    overlayCardRef.current = null;
    restoreBody();
    setDragBoth(null);
  }, [restoreBody, setDragBoth]);

  const cancelDrag = React.useCallback(() => {
    committedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    geomRef.current = null;
    overlayCardRef.current = null;
    restoreBody();
    setDragBoth(null);
  }, [restoreBody, setDragBoth]);

  const onCardPointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>, card: KanbanCard, colId: string) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || dragRef.current) return;
      const el = cardEls.current.get(card.id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      geomRef.current = {
        cardId: card.id,
        fromCol: colId,
        grabX: e.clientX - rect.left,
        grabY: e.clientY - rect.top,
        width: rect.width,
        height: rect.height,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        active: false,
        tf: "translate3d(0px, 0px, 0)",
      };
      overlayCardRef.current = card;
      committedRef.current = false;

      const onMove = (ev: PointerEvent) => {
        const g = geomRef.current;
        if (!g) return;
        if (!g.active) {
          const dist = Math.hypot(ev.clientX - g.startX, ev.clientY - g.startY);
          if (dist < 4) return;
          g.active = true;
          if (typeof document !== "undefined") {
            document.body.style.userSelect = "none";
            document.body.style.cursor = "grabbing";
          }
          const root = rootRef.current;
          if (root) {
            const rr = root.getBoundingClientRect();
            g.tf = `translate3d(${r3(ev.clientX - rr.left - g.grabX)}px, ${r3(
              ev.clientY - rr.top - g.grabY
            )}px, 0)`;
          }
          g.lastX = ev.clientX;
          g.lastY = ev.clientY;
          const startIndex = indexOfCard(boardRef.current, g.fromCol, g.cardId);
          setDragBoth({
            cardId: g.cardId,
            fromCol: g.fromCol,
            overCol: g.fromCol,
            overIndex: Math.max(0, startIndex),
            width: g.width,
            height: g.height,
            settling: false,
          });
          return;
        }
        ev.preventDefault();
        positionOverlay(ev.clientX, ev.clientY);
        const drop = computeDrop(ev.clientX, ev.clientY);
        const cur = dragRef.current;
        if (
          drop &&
          cur &&
          (cur.overCol !== drop.overCol || cur.overIndex !== drop.overIndex)
        ) {
          setDragBoth({ ...cur, ...drop });
        }
      };

      const cleanup = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onCancel);
        cleanupRef.current = null;
      };

      const onEnd = (ev: PointerEvent) => {
        cleanup();
        const g = geomRef.current;
        if (!g) return;
        if (!g.active) {
          geomRef.current = null;
          overlayCardRef.current = null;
          return;
        }
        positionOverlay(ev.clientX, ev.clientY);
        const drop = computeDrop(ev.clientX, ev.clientY);
        const cur = dragRef.current;
        const finalState = cur ? { ...cur, ...(drop ?? {}) } : null;
        if (!finalState) {
          commitMove();
          return;
        }
        if (reducedRef.current) {
          dragRef.current = finalState;
          commitMove();
        } else {
          setDragBoth({ ...finalState, settling: true });
        }
      };

      const onCancel = () => {
        cleanup();
        cancelDrag();
      };

      cleanupRef.current = cleanup;
      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onCancel);
    },
    [cancelDrag, commitMove, computeDrop, positionOverlay, setDragBoth]
  );

  // Re-assert the imperative overlay position after React re-renders (so an
  // `overIndex` change never snaps the airborne card back to (0,0)).
  React.useLayoutEffect(() => {
    const g = geomRef.current;
    const ov = overlayRef.current;
    if (!drag || drag.settling || !g || !ov) return;
    ov.style.transition = "none";
    ov.style.transform = g.tf;
  });

  // Drive the drop settle: ease the overlay from the release point to the gap.
  React.useLayoutEffect(() => {
    if (!drag || !drag.settling) return;
    const ov = overlayRef.current;
    const root = rootRef.current;
    const g = geomRef.current;
    if (!ov || !root || !g) {
      commitMove();
      return;
    }
    const rr = root.getBoundingClientRect();
    const ph = root.querySelector<HTMLElement>("[data-pb-kanban-ph]");
    let tx: number;
    let ty: number;
    if (ph) {
      const pr = ph.getBoundingClientRect();
      tx = pr.left - rr.left;
      ty = pr.top - rr.top;
    } else {
      tx = g.lastX - rr.left - g.grabX;
      ty = g.lastY - rr.top - g.grabY;
    }
    committedRef.current = false;
    ov.style.transition = "transform .34s cubic-bezier(.22,1,.36,1)";
    void ov.getBoundingClientRect();
    ov.style.transform = `translate3d(${r3(tx)}px, ${r3(ty)}px, 0)`;
    timerRef.current = setTimeout(commitMove, 440);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [drag, commitMove]);

  // Restore focus to a card after a keyboard move relocates it.
  React.useEffect(() => {
    const id = pendingFocusRef.current;
    if (!id) return;
    pendingFocusRef.current = null;
    cardEls.current.get(id)?.focus();
  }, [board]);

  // Tear down any live listeners if we unmount mid-drag.
  React.useEffect(() => {
    return () => {
      cleanupRef.current?.();
      restoreBody();
    };
  }, [restoreBody]);

  const onCardKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, card: KanbanCard, colId: string) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key;
      const vertical = key === "ArrowUp" || key === "ArrowDown";
      const horizontal = key === "ArrowLeft" || key === "ArrowRight";
      if (!vertical && !horizontal) return;
      e.preventDefault();

      const cur = boardRef.current;
      const ci = cur.findIndex((c) => c.id === colId);
      if (ci < 0) return;
      const col = cur[ci];
      const idx = col.cards.findIndex((c) => c.id === card.id);
      if (idx < 0) return;

      if (vertical) {
        const ni = key === "ArrowUp" ? idx - 1 : idx + 1;
        if (ni < 0 || ni >= col.cards.length) {
          setAnnounce(
            `${card.title} is already ${
              key === "ArrowUp" ? "at the top" : "at the bottom"
            } of ${col.title}.`
          );
          return;
        }
        const next = applyMove(cur, card.id, colId, colId, ni);
        setBoard(next);
        onChangeRef.current?.(next);
        pendingFocusRef.current = card.id;
        setAnnounce(
          `${card.title} moved to position ${ni + 1} of ${col.cards.length} in ${col.title}.`
        );
        return;
      }

      const dir = key === "ArrowLeft" ? -1 : 1;
      const nci = ci + dir;
      if (nci < 0 || nci >= cur.length) {
        setAnnounce(
          `${card.title} is already in the ${dir < 0 ? "first" : "last"} column.`
        );
        return;
      }
      const target = cur[nci];
      const ni = Math.min(idx, target.cards.length);
      const next = applyMove(cur, card.id, colId, target.id, ni);
      setBoard(next);
      onChangeRef.current?.(next);
      pendingFocusRef.current = card.id;
      setAnnounce(
        `${card.title} moved to ${target.title}, position ${ni + 1} of ${
          target.cards.length + 1
        }.`
      );
    },
    []
  );

  const display = React.useMemo(
    () => computeDisplay(board, drag),
    [board, drag]
  );

  const spring = { type: "spring" as const, stiffness: 260, damping: 26 };

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative w-full max-w-full rounded-2xl border border-white/10",
        "bg-[linear-gradient(180deg,#131315,#0f0f10)] p-3 text-white sm:p-4",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04),0_24px_48px_-28px_rgba(0,0,0,0.85)]",
        className
      )}
      role="group"
      aria-roledescription="Kanban board"
      aria-label="Task board"
      {...props}
    >
      <p id={instrId} className="sr-only">
        To move a card with the keyboard, focus it and hold Control or Command
        while pressing the arrow keys. Up and down reorder within a column; left
        and right move between columns.
      </p>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {display.map(({ col, items }, ci) => {
          const headingId = `pb-kanban-h-${uid}-${ci}`;
          return (
            <section
              key={col.id}
              aria-labelledby={headingId}
              className="flex w-[78vw] min-w-[220px] max-w-[264px] shrink-0 flex-col sm:w-[248px]"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <h3
                  id={headingId}
                  className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300"
                  style={{
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                  }}
                >
                  {col.title}
                </h3>
                <span
                  className="min-w-5 rounded-full bg-white/[0.07] px-1.5 py-0.5 text-center text-[11px] font-medium tabular-nums text-zinc-400"
                  aria-hidden
                >
                  {col.cards.length}
                </span>
              </div>

              <ul
                ref={(el) => {
                  if (el) colEls.current.set(col.id, el);
                  else colEls.current.delete(col.id);
                }}
                role="list"
                aria-label={`${col.title}, ${col.cards.length} cards`}
                className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-2"
                style={{ maxHeight: 420 }}
              >
                {items.map((item, ii) => {
                  if (item.kind === "placeholder") {
                    return (
                      <li key="__pb_ph__" aria-hidden>
                        <div
                          data-pb-kanban-ph
                          className={cn(
                            "rounded-lg border border-dashed border-[#8b5cf6]/50 bg-[#8b5cf6]/[0.06]",
                            !reduced && "pb-kanban-board-ph"
                          )}
                          style={{ height: drag ? drag.height : 0 }}
                        />
                      </li>
                    );
                  }
                  const card = item.card;
                  const pos = col.cards.findIndex((c) => c.id === card.id);
                  return (
                    <motion.li
                      key={card.id}
                      role="listitem"
                      layout={reduced ? false : "position"}
                      transition={spring}
                    >
                      <div
                        ref={(el) => {
                          if (el) cardEls.current.set(card.id, el);
                          else cardEls.current.delete(card.id);
                        }}
                        data-pb-kanban-card
                        role="button"
                        tabIndex={0}
                        aria-roledescription="Draggable card"
                        aria-describedby={instrId}
                        aria-label={`${card.title}${
                          card.tag ? `, ${card.tag}` : ""
                        }. ${col.title}, ${pos + 1} of ${col.cards.length}.`}
                        onPointerDown={(e) =>
                          onCardPointerDown(e, card, col.id)
                        }
                        onKeyDown={(e) => onCardKeyDown(e, card, col.id)}
                        className={cn(
                          CARD_FACE,
                          "block cursor-grab touch-none select-none outline-none transition-shadow",
                          "hover:border-white/20 active:cursor-grabbing",
                          "focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f10]"
                        )}
                      >
                        <CardFace card={card} />
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Drag overlay — the airborne card, positioned imperatively. */}
      {drag && overlayCardRef.current && (
        <div
          ref={overlayRef}
          aria-hidden
          className="pb-kanban-board-overlay pointer-events-none absolute left-0 top-0 z-50 will-change-transform"
          style={{ width: drag.width }}
          onTransitionEnd={(e) => {
            if (e.propertyName === "transform" && drag.settling) commitMove();
          }}
        >
          <div
            className={cn(
              "pb-kanban-board-lift origin-center rounded-lg ring-1 ring-white/15",
              "shadow-[0_18px_44px_-12px_rgba(0,0,0,0.7)]",
              !reduced &&
                "transition-transform duration-300 [transition-timing-function:cubic-bezier(.22,1,.36,1)]",
              !reduced && (drag.settling ? "rotate-0 scale-100" : "-rotate-2 scale-[1.03]")
            )}
          >
            <div className={CARD_FACE}>
              <CardFace card={overlayCardRef.current} />
            </div>
          </div>
        </div>
      )}

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announce}
      </div>
    </div>
  );
}

export default KanbanBoard;
