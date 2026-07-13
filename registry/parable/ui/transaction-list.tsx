"use client";

import * as React from "react";
import {
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "motion/react";
import { cn } from "@/lib/utils";

/** Injects a keyframes/style block once, keyed by a unique id. */
function useInjectedKeyframes(id: string, css: string) {
  React.useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = css;
    document.head.appendChild(el);
  }, [id, css]);
}

/** Lifecycle status of a transaction. */
export type TransactionStatus = "completed" | "pending" | "failed";

export interface Transaction {
  /** Reference id — rendered mono (e.g. "TXN-8F42A9"). Also the React key. */
  id: string;
  /** Counterparty / merchant name. First letter seeds the avatar disc. */
  name: string;
  /** Pre-formatted display date (e.g. "Jul 12"). */
  date: string;
  /** Signed amount. Negative = outgoing (red-ish), positive = incoming (green-ish). */
  amount: number;
  /** Settlement state — drives the status chip. */
  status: TransactionStatus;
  /** ISO 4217 code for this row. Falls back to the list-level `currency`. */
  currency?: string;
  /** Override the auto-picked avatar disc colour (hex). */
  color?: string;
}

export interface TransactionListProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Heading shown in the block header. */
  title?: React.ReactNode;
  /** Rows to render. Defaults to a realistic 7-row sample set. */
  transactions?: Transaction[];
  /** Fallback ISO 4217 code when a row omits its own. */
  currency?: string;
  /** Called with the transaction when a row is activated (makes rows buttons). */
  onRowClick?: (transaction: Transaction) => void;
}

/** Parable palette — mirrors the site's `--pb-*` tokens. */
const DISC_COLORS = ["#8b5cf6", "#ec4899", "#f5a623", "#22d3ee"] as const;

const STATUS_META: Record<
  TransactionStatus,
  { label: string; color: string }
> = {
  completed: { label: "Completed", color: "#34d399" },
  pending: { label: "Pending", color: "#f5a623" },
  failed: { label: "Failed", color: "#fb7185" },
};

const POSITIVE = "#34d399";
const NEGATIVE = "#fb7185";

const DEFAULT_TRANSACTIONS: Transaction[] = [
  { id: "TXN-8F42A9", name: "Aurora Labs", date: "Jul 12", amount: 4820, status: "completed" },
  { id: "TXN-7C10B4", name: "Meridian Bank", date: "Jul 11", amount: -1290.5, status: "completed" },
  { id: "TXN-6A55D2", name: "Northwind Studio", date: "Jul 11", amount: -89.99, status: "pending" },
  { id: "TXN-5B98E1", name: "Cyan & Co.", date: "Jul 10", amount: 15300, status: "completed" },
  { id: "TXN-4D21F7", name: "Ember Freight", date: "Jul 09", amount: -642.18, status: "failed" },
  { id: "TXN-3E77C0", name: "Violet Media", date: "Jul 08", amount: 275, status: "pending" },
  { id: "TXN-2F03A8", name: "Helios Energy", date: "Jul 07", amount: -1180, status: "completed" },
];

/** Stable colour pick from a name, so reordering keeps each disc's hue. */
function discColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return DISC_COLORS[h % DISC_COLORS.length];
}

/** `+$4,820.00` / `−$1,290.50` with a real minus sign (U+2212). */
function formatAmount(amount: number, currency: string): string {
  const body = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
  return `${amount < 0 ? "−" : "+"}${body}`;
}

/**
 * TransactionList — a dashboard block that lists transactions as a semantic
 * `<ul>`/`<li>`: each row has a colour-seeded initial disc, a name with a mono
 * reference id, a date, a mono tabular-nums amount (negative red-ish / positive
 * green-ish), and a dotted status chip (completed / pending / failed). Rows
 * stagger-fade-in on mount with a spring and raise their background on hover;
 * pass `onRowClick` to make each row a real, keyboard-focusable button. Ships a
 * realistic 7-row default set that `transactions` overrides.
 *
 * Colour defaults mirror the site's `--pb-*` tokens (avatar discs cycle
 * violet #8b5cf6 · fuchsia #ec4899 · ember #f5a623 · signal cyan #22d3ee on an
 * ink #0f0f10 surface). Under `prefers-reduced-motion` the stagger is dropped,
 * rows render instantly, and the pending dot stops pulsing.
 *
 * @parable/transaction-list
 */
export function TransactionList({
  title = "Transactions",
  transactions = DEFAULT_TRANSACTIONS,
  currency = "USD",
  onRowClick,
  className,
  ...props
}: TransactionListProps) {
  const reduce = useReducedMotion();
  const headingId = React.useId();

  useInjectedKeyframes(
    "pb-transaction-list-kf",
    "@keyframes pb-txn-pulse{0%,100%{opacity:1}50%{opacity:.3}}.pb-txn-pulse{animation:pb-txn-pulse 1.6s ease-in-out infinite}@media (prefers-reduced-motion:reduce){.pb-txn-pulse{animation:none!important}}"
  );

  const listVariants: Variants = {
    hidden: {},
    visible: {
      transition: reduce
        ? { duration: 0 }
        : { staggerChildren: 0.055, delayChildren: 0.04 },
    },
  };

  const rowSpring: Transition = reduce
    ? { duration: 0 }
    : { type: "spring", stiffness: 240, damping: 24, mass: 0.85 };

  const rowVariants: Variants = {
    hidden: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: rowSpring },
  };

  const interactive = typeof onRowClick === "function";

  return (
    <div
      className={cn(
        "w-full max-w-md overflow-hidden rounded-2xl border border-white/10",
        "bg-white/[0.02] text-white shadow-sm backdrop-blur-sm",
        className
      )}
      style={{ background: "color-mix(in srgb, #0f0f10 82%, transparent)" }}
      {...props}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <h3 id={headingId} className="text-sm font-semibold tracking-tight text-white">
          {title}
        </h3>
        <span
          className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-xs tabular-nums text-white/60 ring-1 ring-inset ring-white/10"
          aria-label={`${transactions.length} transactions`}
        >
          {transactions.length}
        </span>
      </div>

      <motion.ul
        aria-labelledby={headingId}
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className="divide-y divide-white/[0.06]"
      >
        {transactions.map((tx) => {
          const disc = tx.color ?? discColor(tx.name);
          const status = STATUS_META[tx.status];
          const initial = tx.name.trim().charAt(0).toUpperCase() || "?";
          const money = formatAmount(tx.amount, tx.currency ?? currency);
          const rowLabel = `${tx.name}, ${money}, ${status.label}, ${tx.date}`;

          const content = (
            <>
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold"
                style={{
                  color: disc,
                  backgroundColor: `${disc}1f`,
                  boxShadow: `inset 0 0 0 1px ${disc}3d`,
                }}
              >
                {initial}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">
                  {tx.name}
                </span>
                <span className="block truncate font-mono text-[11px] leading-tight text-white/45">
                  {tx.id}
                </span>
              </span>

              <span className="hidden shrink-0 font-mono text-xs tabular-nums text-white/45 sm:block">
                {tx.date}
              </span>

              <span className="flex shrink-0 flex-col items-end gap-1">
                <span
                  className="font-mono text-sm font-semibold tabular-nums"
                  style={{ color: tx.amount < 0 ? NEGATIVE : POSITIVE }}
                >
                  {money}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ color: status.color, backgroundColor: `${status.color}1a` }}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 rounded-full",
                      tx.status === "pending" && "pb-txn-pulse"
                    )}
                    style={{ backgroundColor: status.color }}
                  />
                  {status.label}
                </span>
              </span>
            </>
          );

          return (
            <motion.li key={tx.id} variants={rowVariants}>
              {interactive ? (
                <button
                  type="button"
                  onClick={() => onRowClick?.(tx)}
                  aria-label={rowLabel}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left outline-none",
                    "transition-colors duration-200 hover:bg-white/[0.04]",
                    "focus-visible:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8b5cf6]/70"
                  )}
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-white/[0.03]">
                  {content}
                </div>
              )}
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}

export default TransactionList;
