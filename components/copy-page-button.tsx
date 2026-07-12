"use client";

import * as React from "react";
import { Check, FileText } from "lucide-react";

/** "Copy Page" — copies an LLM-friendly markdown version of the page. */
export function CopyPageButton({ markdown }: { markdown: string }) {
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-500" />
      ) : (
        <FileText className="size-3.5" />
      )}
      {copied ? "Copied" : "Copy Page"}
    </button>
  );
}
