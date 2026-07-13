"use client";

import * as React from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
  type Transition,
} from "motion/react";
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  LoaderCircle,
  Search,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** A tradable token. `price` is a USD reference used for the estimate math. */
export interface SwapToken {
  /** Ticker shown on the field, e.g. "ETH". Used as the stable identity. */
  symbol: string;
  /** Full name shown in the picker, e.g. "Ethereum". */
  name: string;
  /** Optional glyph. Falls back to a lettered coin tile. */
  icon?: React.ReactNode;
  /** USD price. The receive estimate is `pay * fromPrice / toPrice`. */
  price: number;
}

/** Payload handed to `onSwap` when the primary button is pressed. */
export interface TokenSwapPayload {
  from: SwapToken;
  to: SwapToken;
  payAmount: number;
  receiveAmount: number;
}

export interface TokenSwapCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSubmit"> {
  /** Tokens offered on both sides. Needs at least two distinct symbols. */
  tokens: SwapToken[];
  /** Symbol pre-selected in the "You pay" field. Defaults to `tokens[0]`. */
  defaultFrom?: string;
  /** Symbol pre-selected in the "You receive" field. Defaults to `tokens[1]`. */
  defaultTo?: string;
  /** Amount pre-filled in the "You pay" field. Defaults to `"1"`. */
  defaultAmount?: string;
  /**
   * Runs when "Swap" is pressed. Resolve to reach the done state, throw to fall
   * back to idle. Defaults to a fake ~1.1s settle so the card demos itself.
   */
  onSwap?: (payload: TokenSwapPayload) => Promise<void> | void;
  /** Accent hex — button, focus ring, active option. Default Parable violet. */
  accent?: string;
}

/** Which physical field currently holds the user-typed value. */
type EditSide = "pay" | "receive";
/** Primary-button flow state. */
type SwapPhase = "idle" | "pending" | "done";

/** Strip everything but digits and collapse to a single decimal point. */
function sanitizeAmount(value: string): string {
  let s = value.replace(/[^0-9.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) {
    s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, "");
  }
  return s;
}

/** Deterministic, locale-free grouping so SSR and client render identically. */
function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Format a token amount with magnitude-aware precision, trailing zeros trimmed. */
function formatAmount(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0";
  const abs = Math.abs(n);
  const decimals = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
  let s = n.toFixed(decimals);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  const [intPart, frac] = s.split(".");
  const grouped = groupThousands(intPart);
  return frac ? `${grouped}.${frac}` : grouped;
}

/** Format a USD figure to two grouped decimals. */
function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return "$0.00";
  const [intPart, frac] = Math.abs(n).toFixed(2).split(".");
  return `${n < 0 ? "-" : ""}$${groupThousands(intPart)}.${frac}`;
}

/** Fallback coin tile: the symbol's first letter on a tinted disc. */
function CoinGlyph({ symbol }: { symbol: string }) {
  return (
    <span
      aria-hidden
      className="grid size-full place-items-center rounded-full bg-white/10 text-[11px] font-semibold text-white/80"
    >
      {symbol.slice(0, 1).toUpperCase()}
    </span>
  );
}

/**
 * Keyboard-operable token picker: a trigger that opens a searchable listbox
 * (combobox pattern — arrow keys move the active option, Enter selects, Escape
 * closes and restores focus, outside-press dismisses).
 */
function TokenSelect({
  tokens,
  value,
  onSelect,
  side,
  accent,
}: {
  tokens: SwapToken[];
  value: SwapToken;
  onSelect: (symbol: string) => void;
  side: EditSide;
  accent: string;
}) {
  const uid = React.useId();
  const listId = `pb-tsc-list-${uid}`;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
    );
  }, [tokens, query]);

  // Keep the active index in range as the filtered set changes.
  React.useEffect(() => {
    setActive((i) => (i >= filtered.length ? 0 : i));
  }, [filtered.length]);

  // Focus the search field on open; reset the query each time it opens.
  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Dismiss on outside press.
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Scroll the active option into view as it moves.
  React.useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      '[data-active="true"]'
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const commit = (token: SwapToken | undefined) => {
    if (!token) return;
    onSelect(token.symbol);
    close(true);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => (filtered.length ? (i + 1) % filtered.length : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) =>
          filtered.length ? (i - 1 + filtered.length) % filtered.length : 0
        );
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(Math.max(0, filtered.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        commit(filtered[active]);
        break;
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const activeId = filtered[active] ? `${listId}-opt-${active}` : undefined;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${side === "pay" ? "Pay" : "Receive"} token: ${value.name}. Change token`}
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3",
          "bg-white/[0.06] text-sm font-semibold text-white",
          "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] transition-colors duration-200",
          "hover:bg-white/[0.1] active:translate-y-px",
          "outline-none focus-visible:ring-2 focus-visible:ring-[var(--pb-tsc-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f10]"
        )}
      >
        <span className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-full [&_img]:size-full [&_img]:object-cover [&_svg]:size-4">
          {value.icon ?? <CoinGlyph symbol={value.symbol} />}
        </span>
        {value.symbol}
        <ChevronDown
          aria-hidden
          className={cn(
            "size-4 text-white/50 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "absolute right-0 z-30 mt-2 w-60 origin-top-right overflow-hidden rounded-2xl",
              "bg-[#141416] text-white",
              "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),0_24px_60px_-24px_rgba(0,0,0,0.85)]"
            )}
          >
            <div className="flex items-center gap-2 border-b border-white/10 px-3">
              <Search aria-hidden className="size-4 shrink-0 text-white/40" />
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded
                aria-controls={listId}
                aria-activedescendant={activeId}
                aria-autocomplete="list"
                aria-label="Search tokens"
                placeholder="Search name or symbol"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKeyDown}
                className="h-11 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
            </div>
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label="Tokens"
              className="max-h-56 overflow-y-auto p-1.5"
            >
              {filtered.length === 0 && (
                <li className="px-3 py-6 text-center text-[13px] text-white/40">
                  No tokens found
                </li>
              )}
              {filtered.map((t, i) => {
                const isActive = i === active;
                const isSelected = t.symbol === value.symbol;
                return (
                  <li
                    key={t.symbol}
                    id={`${listId}-opt-${i}`}
                    role="option"
                    aria-selected={isSelected}
                    data-active={isActive}
                    onClick={() => commit(t)}
                    onPointerMove={() => setActive(i)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-sm",
                      "transition-colors duration-100",
                      isActive ? "bg-white/[0.08]" : "bg-transparent"
                    )}
                  >
                    <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-white/5 [&_img]:size-full [&_img]:object-cover [&_svg]:size-5">
                      {t.icon ?? <CoinGlyph symbol={t.symbol} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-white">
                        {t.symbol}
                      </span>
                      <span className="block truncate text-xs text-white/45">
                        {t.name}
                      </span>
                    </span>
                    {isSelected && (
                      <Check
                        aria-hidden
                        className="size-4 shrink-0"
                        style={{ color: accent }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * TokenSwapCard — a demo-grade crypto swap card (no real chain). Two fields,
 * "You pay" and "You receive", each pairing a searchable token picker with an
 * amount input; editing either side derives the other from the tokens' USD
 * price ratio. The center button flips 180° and swaps the two sides on a
 * spring, a live rate line tracks the pair, and the primary "Swap" button runs
 * an inline pending → done animation while `onSwap` resolves (default: a fake
 * ~1.1s settle).
 *
 * Semantics are real: labelled `<input>`s with `inputMode="decimal"`, a
 * combobox/listbox token picker driven entirely by the keyboard (arrows, Enter,
 * Escape, type-to-filter), a polite `role="status"` live region for the swap
 * flow, and `:focus-visible` rings on every control. Under
 * `prefers-reduced-motion` the flip, card cross, and spinner are dropped and
 * every state change is instant. Amounts are formatted locale-free so SSR and
 * client agree.
 *
 * Colours default to the Parable palette (accent violet `#8b5cf6` on ink
 * `#0f0f10`), mirroring the site's `--pb-*` tokens; `accent` is a 6-digit hex.
 *
 * @parable/token-swap-card
 */
export function TokenSwapCard({
  tokens,
  defaultFrom,
  defaultTo,
  defaultAmount = "1",
  onSwap,
  accent = "#8b5cf6",
  className,
  style,
  ...props
}: TokenSwapCardProps) {
  const reduce = useReducedMotion() ?? false;

  // Resolve the initial pair, tolerating bad/missing default symbols.
  const initial = React.useMemo(() => {
    const has = (s?: string) => tokens.some((t) => t.symbol === s);
    const first = has(defaultFrom) ? defaultFrom! : tokens[0]?.symbol;
    let second = has(defaultTo) ? defaultTo! : undefined;
    if (!second || second === first) {
      second = tokens.find((t) => t.symbol !== first)?.symbol ?? first;
    }
    return { first, second };
    // Only seed on mount — later prop changes don't yank the user's selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [fromSymbol, setFromSymbol] = React.useState(initial.first);
  const [toSymbol, setToSymbol] = React.useState(initial.second);
  const [rawAmount, setRawAmount] = React.useState(() =>
    sanitizeAmount(defaultAmount)
  );
  const [editSide, setEditSide] = React.useState<EditSide>("pay");
  const [phase, setPhase] = React.useState<SwapPhase>("idle");

  const bySymbol = React.useMemo(() => {
    const map = new Map<string, SwapToken>();
    for (const t of tokens) map.set(t.symbol, t);
    return map;
  }, [tokens]);

  const fromToken = bySymbol.get(fromSymbol) ?? tokens[0];
  const toToken = bySymbol.get(toSymbol) ?? tokens[1] ?? tokens[0];

  const uid = React.useId();
  const payId = `pb-tsc-pay-${uid}`;
  const receiveId = `pb-tsc-receive-${uid}`;

  const payControls = useAnimationControls();
  const receiveControls = useAnimationControls();
  const rotationRef = React.useRef(0);
  const [rotation, setRotation] = React.useState(0);

  const mountedRef = React.useRef(true);
  const doneTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (doneTimer.current) clearTimeout(doneTimer.current);
    };
  }, []);

  // Guard against a missing pair after all fallbacks (e.g. empty `tokens`).
  if (!fromToken || !toToken) return null;

  const fromPrice = fromToken.price;
  const toPrice = toToken.price;
  const ratio = toPrice > 0 ? fromPrice / toPrice : 0; // pay → receive

  const typed = Number.parseFloat(rawAmount) || 0;
  const payNum = editSide === "pay" ? typed : ratio > 0 ? typed / ratio : 0;
  const receiveNum = editSide === "pay" ? typed * ratio : typed;

  const payDisplay =
    editSide === "pay" ? rawAmount : payNum === 0 ? "" : formatAmount(payNum);
  const receiveDisplay =
    editSide === "receive"
      ? rawAmount
      : receiveNum === 0
        ? ""
        : formatAmount(receiveNum);

  const crossSpring: Transition = { type: "spring", stiffness: 200, damping: 22 };
  const rotateSpring: Transition = { type: "spring", stiffness: 240, damping: 20 };
  const contentSwap: Transition = reduce
    ? { duration: 0 }
    : { duration: 0.26, ease: [0.22, 1, 0.36, 1] };

  const flip = () => {
    setFromSymbol(toSymbol);
    setToSymbol(fromSymbol);
    // Keep the typed number attached to its token by mirroring the edit side.
    setEditSide((s) => (s === "pay" ? "receive" : "pay"));
    if (reduce) return;
    rotationRef.current += 180;
    setRotation(rotationRef.current);
    // Start each card off the opposite slot, then spring them across.
    payControls.set({ y: 44 });
    receiveControls.set({ y: -44 });
    void payControls.start({ y: 0, transition: crossSpring });
    void receiveControls.start({ y: 0, transition: crossSpring });
  };

  const pickFrom = (symbol: string) => {
    if (symbol === toSymbol) setToSymbol(fromSymbol);
    setFromSymbol(symbol);
  };
  const pickTo = (symbol: string) => {
    if (symbol === fromSymbol) setFromSymbol(toSymbol);
    setToSymbol(symbol);
  };

  const onPayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditSide("pay");
    setRawAmount(sanitizeAmount(e.target.value));
  };
  const onReceiveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditSide("receive");
    setRawAmount(sanitizeAmount(e.target.value));
  };

  const defaultSwap = () =>
    new Promise<void>((resolve) => setTimeout(resolve, 1100));

  const canSwap = phase === "idle" && payNum > 0 && fromSymbol !== toSymbol;

  const runSwap = async () => {
    if (phase !== "idle") return;
    if (!canSwap) return;
    setPhase("pending");
    try {
      await (onSwap ?? defaultSwap)({
        from: fromToken,
        to: toToken,
        payAmount: payNum,
        receiveAmount: receiveNum,
      });
      if (!mountedRef.current) return;
      setPhase("done");
      doneTimer.current = setTimeout(() => {
        if (mountedRef.current) setPhase("idle");
      }, 1400);
    } catch {
      if (mountedRef.current) setPhase("idle");
    }
  };

  const statusMessage =
    phase === "pending"
      ? `Swapping ${formatAmount(payNum)} ${fromToken.symbol} for ${toToken.symbol}.`
      : phase === "done"
        ? `Swapped. You received about ${formatAmount(receiveNum)} ${toToken.symbol}.`
        : "";

  const field = (
    side: EditSide,
    token: SwapToken,
    controls: typeof payControls
  ) => {
    const isPay = side === "pay";
    const inputId = isPay ? payId : receiveId;
    const usd = isPay ? payNum * fromPrice : receiveNum * toPrice;
    return (
      <motion.div
        animate={controls}
        className="relative rounded-2xl bg-white/[0.03] p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
      >
        <div className="flex items-center justify-between">
          <label htmlFor={inputId} className="text-xs font-medium text-white/45">
            {isPay ? "You pay" : "You receive"}
          </label>
          <span className="flex items-center gap-1 text-[11px] text-white/35">
            <Wallet aria-hidden className="size-3" />
            {token.symbol}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder="0"
            value={isPay ? payDisplay : receiveDisplay}
            onChange={isPay ? onPayChange : onReceiveChange}
            className={cn(
              "min-w-0 flex-1 bg-transparent text-2xl font-semibold tracking-tight text-white",
              "outline-none placeholder:text-white/25",
              "rounded-md focus-visible:ring-2 focus-visible:ring-[var(--pb-tsc-accent)]/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#0f0f10]"
            )}
          />
          <TokenSelect
            tokens={tokens}
            value={token}
            onSelect={isPay ? pickFrom : pickTo}
            side={side}
            accent={accent}
          />
        </div>
        <div className="mt-1 text-xs text-white/35">{formatUsd(usd)}</div>
      </motion.div>
    );
  };

  return (
    <div
      className={cn(
        "relative w-full max-w-sm rounded-3xl p-4 text-white sm:p-5",
        "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_28px_70px_-28px_rgba(0,0,0,0.85)]",
        className
      )}
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0) 40%), #0f0f10",
        ...({ "--pb-tsc-accent": accent } as React.CSSProperties),
        ...style,
      }}
      {...props}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold tracking-tight">Swap</h2>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white/40">
          demo
        </span>
      </div>

      {/* Screen-reader narration for the swap flow. */}
      <span role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </span>

      <div className="relative flex flex-col gap-1.5">
        {field("pay", fromToken, payControls)}
        {field("receive", toToken, receiveControls)}

        {/* Flip button straddles the seam between the two fields. */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
          <motion.button
            type="button"
            onClick={flip}
            aria-label={`Swap direction — pay ${toToken.symbol} for ${fromToken.symbol} instead`}
            animate={{ rotate: reduce ? 0 : rotation }}
            transition={rotateSpring}
            whileTap={reduce ? undefined : { scale: 0.9 }}
            className={cn(
              "pointer-events-auto grid size-10 place-items-center rounded-xl",
              "bg-[#141416] text-white",
              "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_6px_16px_-6px_rgba(0,0,0,0.9)]",
              "transition-colors duration-200 hover:bg-[#1b1b1e]",
              "outline-none focus-visible:ring-2 focus-visible:ring-[var(--pb-tsc-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f10]"
            )}
          >
            <ArrowDownUp aria-hidden className="size-4" strokeWidth={2.25} />
          </motion.button>
        </div>
      </div>

      {/* Live rate line */}
      <div className="mt-3 flex items-center justify-between px-1 text-xs">
        <span className="text-white/40">Rate</span>
        <span className="font-medium text-white/70">
          1 {fromToken.symbol} ≈ {formatAmount(ratio)} {toToken.symbol}
        </span>
      </div>

      <button
        type="button"
        onClick={runSwap}
        disabled={!canSwap}
        aria-busy={phase === "pending"}
        className={cn(
          "relative mt-3 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl",
          "text-sm font-semibold text-white transition-[filter,transform] duration-200",
          "hover:brightness-110 active:translate-y-px",
          "disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:brightness-100",
          "outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f10]"
        )}
        style={{
          background: `linear-gradient(180deg, ${accent}, ${accent}d9)`,
          boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.25), 0 10px 26px -12px ${accent}c0`,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {phase === "pending" ? (
            <motion.span
              key="pending"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={contentSwap}
              className="flex items-center gap-2"
            >
              <LoaderCircle
                aria-hidden
                className={cn("size-4", !reduce && "animate-spin")}
              />
              Swapping…
            </motion.span>
          ) : phase === "done" ? (
            <motion.span
              key="done"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={contentSwap}
              className="flex items-center gap-2"
            >
              <motion.svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
                className="size-4"
              >
                <motion.path
                  d="M5 12.5l4.3 4.3L19 7.3"
                  stroke="currentColor"
                  strokeWidth={2.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={reduce ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={
                    reduce ? { duration: 0 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
                  }
                />
              </motion.svg>
              Swap complete
            </motion.span>
          ) : (
            <motion.span
              key="idle"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={contentSwap}
            >
              {payNum > 0 ? "Swap" : "Enter an amount"}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}

export default TokenSwapCard;
