"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { releaseBalloons } from "@/components/balloons";

export function CloneBlock({
  degit,
  repo,
  slug,
}: {
  degit: string;
  repo: string;
  slug: string;
}) {
  const options = React.useMemo(
    () => [
      { key: "degit", label: "degit", cmd: `npx degit ${degit} ${slug}` },
      { key: "git", label: "git", cmd: `git clone ${repo}.git` },
      {
        key: "gh",
        label: "gh",
        cmd: `gh repo clone ${degit}`,
      },
    ],
    [degit, repo, slug]
  );
  const [active, setActive] = React.useState(options[0].key);
  const [copied, setCopied] = React.useState(false);
  const command = options.find((o) => o.key === active)!.cmd;

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
        aria-label="Clone method"
        className="flex items-center gap-1 border-b bg-muted/40 px-2 py-1.5"
      >
        {options.map((o) => (
          <button
            key={o.key}
            role="tab"
            aria-selected={active === o.key}
            onClick={() => setActive(o.key)}
            className={cn(
              "rounded-md px-2.5 py-1 font-mono text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active === o.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[13px]">
          {command}
        </code>
        <button
          onClick={copy}
          aria-label="Copy clone command"
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
