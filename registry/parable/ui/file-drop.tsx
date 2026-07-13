"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Check,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileCode2,
  FileText,
  FileVideo,
  Image as ImageIcon,
  UploadCloud,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Inject a `<style>` with `@keyframes` exactly once per id, from an effect so
 * the first client paint matches the server (no SSR keyframe mismatch). Kept in
 * the document head for the lifetime of the app — sibling instances share it.
 */
function useInjectedKeyframes(id: string, css: string) {
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }, [id, css]);
}

const KEYFRAMES = `
@keyframes pb-file-drop-shake {
  10%, 90% { transform: translate3d(-1px, 0, 0); }
  20%, 80% { transform: translate3d(2px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
  40%, 60% { transform: translate3d(4px, 0, 0); }
}
@keyframes pb-file-drop-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(220%); }
}
`;

/** Human-readable byte count. Client-only (files never exist during SSR). */
function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    units.length - 1
  );
  const value = bytes / Math.pow(k, i);
  const rounded = i === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[i]}`;
}

/** Map a file to a representative lucide glyph by mime, then extension. */
function pickIcon(file: File): React.ComponentType<{
  className?: string;
  strokeWidth?: number;
  "aria-hidden"?: boolean;
}> {
  const type = file.type;
  const name = file.name.toLowerCase();
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("video/")) return FileVideo;
  if (type.startsWith("audio/")) return FileAudio;
  if (type === "application/pdf" || name.endsWith(".pdf")) return FileText;
  if (/\.(zip|rar|7z|tar|gz|bz2)$/.test(name)) return FileArchive;
  if (/\.(js|mjs|ts|tsx|jsx|json|css|html|py|rb|go|rs|java|c|cpp|sh)$/.test(name))
    return FileCode2;
  if (/\.(txt|md|rtf|doc|docx|csv)$/.test(name)) return FileText;
  return FileIcon;
}

interface DropItem {
  id: string;
  file: File;
}

interface FileChipProps {
  file: File;
  reduce: boolean;
  onRemove: () => void;
}

/**
 * One accepted file: type glyph, name, a fake progress bar that eases to 100%
 * (jumps straight to done under reduced motion), and a remove control. Progress
 * is rAF-driven with an ease-out cubic — never a linear ramp.
 */
function FileChip({ file, reduce, onRemove }: FileChipProps) {
  const [pct, setPct] = React.useState(reduce ? 100 : 0);

  React.useEffect(() => {
    if (reduce) {
      setPct(100);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const duration = 1100;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setPct(Math.round(easeOutCubic(t) * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const done = pct >= 100;
  const Icon = pickIcon(file);

  return (
    <motion.li
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 12, scale: 0.98 }}
      transition={
        reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 24 }
      }
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/5 text-[var(--pb-fd-violet)] ring-1 ring-white/10">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{file.name}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="relative h-full overflow-hidden rounded-full"
              style={{
                width: `${pct}%`,
                background:
                  "linear-gradient(90deg, var(--pb-fd-violet), var(--pb-fd-fuchsia))",
              }}
            >
              {!done && !reduce && (
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
                    animation:
                      "pb-file-drop-shimmer 1.1s cubic-bezier(.22,1,.36,1) infinite",
                  }}
                />
              )}
            </div>
          </div>
          <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-white/45">
            {done ? formatBytes(file.size) : `${pct}%`}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {done && (
          <Check
            className="size-4 text-[var(--pb-fd-signal)]"
            strokeWidth={2.5}
            aria-hidden
          />
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${file.name}`}
          className={cn(
            "grid size-7 place-items-center rounded-md text-white/40 outline-none",
            "transition-colors hover:bg-white/10 hover:text-white",
            "focus-visible:ring-2 focus-visible:ring-[var(--pb-fd-violet)]",
            "focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--pb-fd-ink)]"
          )}
        >
          <X className="size-4" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </motion.li>
  );
}

export interface FileDropProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrop"> {
  /** Native `accept` filter, e.g. `"image/*,application/pdf"`. */
  accept?: string;
  /** Allow selecting/dropping more than one file (chips accumulate). */
  multiple?: boolean;
  /** Fired with the files accepted by the last drop/browse (post size check). */
  onFiles?: (files: File[]) => void;
  /** Reject (and shake) any file larger than this many megabytes. */
  maxSizeMB?: number;
}

/**
 * FileDrop — a demo-grade drag-and-drop dropzone (no real upload). A dashed zone
 * highlights and lifts its icon on drag-over, accepts a drop or click/keyboard
 * to browse via a real hidden `<input type="file">`, then lists chosen files as
 * chips with a type glyph, size, a fake ease-out progress bar, and a remove
 * button. Oversized files (`maxSizeMB`) are rejected and the zone shakes.
 *
 * Fully accessible: the visible zone is a `<label>` bound to the input, so the
 * input is focusable and Enter/Space opens the picker; a polite `aria-live`
 * region announces added, removed, and rejected files; every control shows a
 * `:focus-visible` ring. Under `prefers-reduced-motion` there is no scale,
 * shake, or shimmer and progress jumps straight to done — the fallback stays
 * fully legible. Nothing is uploaded anywhere.
 *
 * Colours mirror the site's `--pb-*` tokens (violet #8b5cf6, fuchsia #ec4899,
 * signal #22d3ee, ember #f5a623 on ink #0f0f10) and can be overridden via those
 * CSS variables or `style`.
 *
 * @parable/file-drop
 */
export function FileDrop({
  accept,
  multiple = false,
  onFiles,
  maxSizeMB,
  className,
  style,
  ...props
}: FileDropProps) {
  useInjectedKeyframes("pb-file-drop-kf", KEYFRAMES);
  const reduce = useReducedMotion() === true;

  const reactId = React.useId();
  const inputId = `pb-fd-input-${reactId}`;
  const hintId = `pb-fd-hint-${reactId}`;

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const dragDepth = React.useRef(0);
  const counter = React.useRef(0);
  const errorTimer = React.useRef<number | null>(null);

  const [items, setItems] = React.useState<DropItem[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const [errored, setErrored] = React.useState(false);
  const [shakeToken, setShakeToken] = React.useState(0);
  const [liveMsg, setLiveMsg] = React.useState("");

  React.useEffect(() => {
    return () => {
      if (errorTimer.current !== null) window.clearTimeout(errorTimer.current);
    };
  }, []);

  const handleFiles = React.useCallback(
    (list: FileList | null) => {
      const incoming = Array.from(list ?? []);
      if (incoming.length === 0) return;
      const chosen = multiple ? incoming : incoming.slice(0, 1);
      const limit =
        maxSizeMB != null ? maxSizeMB * 1024 * 1024 : Number.POSITIVE_INFINITY;

      const accepted: File[] = [];
      let rejected = 0;
      for (const file of chosen) {
        if (file.size > limit) rejected += 1;
        else accepted.push(file);
      }

      if (accepted.length > 0) {
        const entries = accepted.map((file) => ({
          id: `${reactId}-${(counter.current += 1)}`,
          file,
        }));
        setItems((prev) => (multiple ? [...prev, ...entries] : entries));
        onFiles?.(accepted);
      }

      if (rejected > 0) {
        setErrored(true);
        if (errorTimer.current !== null) window.clearTimeout(errorTimer.current);
        errorTimer.current = window.setTimeout(() => setErrored(false), 1100);
        if (!reduce) setShakeToken((t) => t + 1);
      }

      const parts: string[] = [];
      if (accepted.length > 0)
        parts.push(`${accepted.length} file${accepted.length > 1 ? "s" : ""} added`);
      if (rejected > 0)
        parts.push(
          `${rejected} file${rejected > 1 ? "s" : ""} rejected, over ${maxSizeMB} MB`
        );
      if (parts.length > 0) setLiveMsg(`${parts.join(". ")}.`);
    },
    [multiple, maxSizeMB, onFiles, reduce, reactId]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const dragHasFiles = (e: React.DragEvent) =>
    Array.from(e.dataTransfer.types).includes("Files");

  const onDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };
  const onDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  };
  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (id: string, name: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    setLiveMsg(`Removed ${name}.`);
  };

  const acceptLabel = accept
    ? accept
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", ")
    : "Any file";
  const hintText =
    maxSizeMB != null ? `${acceptLabel} · up to ${maxSizeMB} MB` : acceptLabel;

  const cssVars = {
    "--pb-fd-violet": "var(--pb-violet, #8b5cf6)",
    "--pb-fd-fuchsia": "var(--pb-fuchsia, #ec4899)",
    "--pb-fd-signal": "var(--pb-signal, #22d3ee)",
    "--pb-fd-ember": "var(--pb-ember, #f5a623)",
    "--pb-fd-ink": "var(--pb-ink, #0f0f10)",
  } as React.CSSProperties;

  return (
    <div
      className={cn("w-full text-left", className)}
      style={{ ...cssVars, ...style }}
      {...props}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onInputChange}
        aria-describedby={hintId}
        className="peer sr-only"
      />

      <label
        key={`pb-fd-zone-${shakeToken}`}
        htmlFor={inputId}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        data-drag={dragging}
        data-error={errored}
        style={{
          animation:
            shakeToken > 0
              ? "pb-file-drop-shake 0.42s cubic-bezier(.36,.07,.19,.97) both"
              : undefined,
        }}
        className={cn(
          "group relative flex flex-col items-center justify-center gap-3 rounded-2xl px-6 py-10 text-center",
          "border-2 border-dashed border-white/15 bg-white/[0.02]",
          "cursor-pointer transition-colors duration-200",
          "hover:border-white/25 hover:bg-white/[0.03]",
          "data-[drag=true]:border-[var(--pb-fd-signal)] data-[drag=true]:bg-[var(--pb-fd-signal)]/10",
          "data-[error=true]:border-[var(--pb-fd-ember)]",
          "peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--pb-fd-violet)]",
          "peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--pb-fd-ink)]"
        )}
      >
        <motion.span
          aria-hidden
          animate={{
            scale: dragging && !reduce ? 1.12 : 1,
            y: dragging && !reduce ? -2 : 0,
          }}
          transition={
            reduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 240, damping: 18 }
          }
          className={cn(
            "grid size-12 place-items-center rounded-xl bg-white/5 ring-1 ring-white/10",
            "text-[var(--pb-fd-violet)] transition-colors",
            "group-data-[drag=true]:text-[var(--pb-fd-signal)] group-data-[drag=true]:ring-[var(--pb-fd-signal)]/30"
          )}
        >
          <UploadCloud className="size-6" strokeWidth={1.75} />
        </motion.span>

        <span className="space-y-1">
          <span className="block text-sm font-medium text-white">
            <span className="text-[var(--pb-fd-violet)]">Click to browse</span>{" "}
            or drag &amp; drop
          </span>
          <span id={hintId} className="block text-xs text-white/45">
            {hintText}
          </span>
        </span>
      </label>

      <div aria-live="polite" role="status" className="sr-only">
        {liveMsg}
      </div>

      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <FileChip
                key={item.id}
                file={item.file}
                reduce={reduce}
                onRemove={() => removeFile(item.id, item.file.name)}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

export default FileDrop;
