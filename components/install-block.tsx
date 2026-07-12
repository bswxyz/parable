"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { installCommand } from "@/lib/catalog";
import { releaseBalloons } from "@/components/balloons";

const PMS = ["npm", "pnpm", "yarn", "bun"] as const;
type PM = (typeof PMS)[number];

export function InstallBlock({ slug }: { slug: string }) {
  const [pm, setPm] = React.useState<PM>("npm");
  const [copied, setCopied] = React.useState(false);
  const command = installCommand(slug, pm);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      return;
    }
    setCopied(true);
    releaseBalloons();
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div
        role="tablist"
        aria-label="Package manager"
        className="flex items-center gap-1 border-b bg-muted/40 px-2 py-1.5"
      >
        {PMS.map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={pm === p}
            onClick={() => setPm(p)}
            className={cn(
              "rounded-md px-2.5 py-1 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              pm === p
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[13px] text-foreground">
          {command}
        </code>
        <button
          onClick={copy}
          aria-label="Copy install command"
          data-copied={copied}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copied ? (
            <Check className="size-4 text-emerald-500" />
          ) : (
            <Copy className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}
